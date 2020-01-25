# -*- coding: utf-8 -*-
"""Define additional context data to be passed to any request.

Copyright (C) 2020 Gitcoin Core

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.

"""
import json
import logging

from django.conf import settings
from django.utils import timezone

from app.utils import get_location_from_ip
from dashboard.models import Activity, Tip, UserAction
from dashboard.utils import _get_utm_from_cookie
from kudos.models import KudosTransfer
from marketing.utils import handle_marketing_callback
from retail.helpers import get_ip

RECORD_VISIT_EVERY_N_SECONDS = 60 * 60

logger = logging.getLogger(__name__)


def preprocess(request):
    """Handle inserting pertinent data into the current context."""

    # make lbcheck super lightweight
    if request.path == '/lbcheck':
        return {}

    from marketing.utils import get_stat
    try:
        num_slack = int(get_stat('slack_users'))
    except Exception:
        num_slack = 0
    if num_slack > 1000:
        num_slack = f'{str(round((num_slack) / 1000, 1))}k'

    user_is_authenticated = request.user.is_authenticated
    profile = request.user.profile if user_is_authenticated and hasattr(request.user, 'profile') else None
    email_subs = profile.email_subscriptions if profile else None
    email_key = email_subs.first().priv if user_is_authenticated and email_subs and email_subs.exists() else ''
    if user_is_authenticated and profile and profile.pk:
        # what actions to take?
        record_join = not profile.last_visit
        record_visit = not profile.last_visit or profile.last_visit < (
            timezone.now() - timezone.timedelta(seconds=RECORD_VISIT_EVERY_N_SECONDS)
        )
        if record_visit:
            ip_address = get_ip(request)
            profile.last_visit = timezone.now()
            try:
                profile.as_dict = json.loads(json.dumps(profile.to_dict()))
                profile.save()
            except Exception as e:
                logger.exception(e)
            metadata = {
                'useragent': request.META['HTTP_USER_AGENT'],
                'referrer': request.META.get('HTTP_REFERER', None),
                'path': request.META.get('PATH_INFO', None),
            }
            UserAction.objects.create(
                user=request.user,
                profile=profile,
                action='Visit',
                location_data=get_location_from_ip(ip_address),
                ip_address=ip_address,
                utm=_get_utm_from_cookie(request),
                metadata=metadata,
            )

        if record_join:
            Activity.objects.create(profile=profile, activity_type='joined')

    # handles marketing callbacks
    if request.GET.get('cb'):
        callback = request.GET.get('cb')
        handle_marketing_callback(callback, request)

    chat_unread_messages = False

    if profile and profile.chat_id:
        try:
            from chat.tasks import get_driver
            chat_driver = get_driver()

            chat_unreads_request = chat_driver.teams.get_team_unreads_for_user(profile.chat_id)

            for teams in chat_unreads_request:
                if teams['msg_count'] > 0 or teams['mention_count'] > 0:
                    chat_unread_messages = True
                    break
        except Exception as e:
            logger.error(str(e))

    context = {
        'STATIC_URL': settings.STATIC_URL,
        'MEDIA_URL': settings.MEDIA_URL,
        'num_slack': num_slack,
        'chat_unread_messages': chat_unread_messages,
        'github_handle': request.user.username if user_is_authenticated else False,
        'email': request.user.email if user_is_authenticated else False,
        'name': request.user.get_full_name() if user_is_authenticated else False,
        'raven_js_version': settings.RAVEN_JS_VERSION,
        'raven_js_dsn': settings.SENTRY_JS_DSN,
        'release': settings.RELEASE,
        'env': settings.ENV,
        'INFURA_V3_PROJECT_ID': settings.INFURA_V3_PROJECT_ID,
        'email_key': email_key,
        'orgs': profile.organizations if profile else [],
        'profile_id': profile.id if profile else '',
        'hotjar': settings.HOTJAR_CONFIG,
        'ipfs_config': {
            'host': settings.JS_IPFS_HOST,
            'port': settings.IPFS_API_PORT,
            'protocol': settings.IPFS_API_SCHEME,
            'root': settings.IPFS_API_ROOT,
        },
        'access_token': profile.access_token if profile else '',
        'is_staff': request.user.is_staff if user_is_authenticated else False,
        'is_moderator': profile.is_moderator if profile else False,
        'persona_is_funder': profile.persona_is_funder if profile else False,
        'persona_is_hunter': profile.persona_is_hunter if profile else False,
        'profile_url': profile.url if profile else False,
        'quests_live': settings.QUESTS_LIVE,
    }
    context['json_context'] = json.dumps(context)

    if context['github_handle']:
        context['unclaimed_tips'] = Tip.objects.filter(
            expires_date__gte=timezone.now(),
            receive_txid='',
            username__iexact=context['github_handle'],
            web3_type='v3',
        ).send_happy_path()
        context['unclaimed_kudos'] = KudosTransfer.objects.filter(
            receive_txid='', username__iexact="@" + context['github_handle'], web3_type='v3',
        ).send_happy_path()

        if not settings.DEBUG:
            context['unclaimed_tips'] = context['unclaimed_tips'].filter(network='mainnet')
            context['unclaimed_kudos'] = context['unclaimed_kudos'].filter(network='mainnet')

    return context
