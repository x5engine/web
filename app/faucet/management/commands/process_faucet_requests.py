'''
    Copyright (C) 2019 Gitcoin Core

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

'''
from django.core.management.base import BaseCommand

from faucet.models import FaucetRequest
from marketing.mails import reject_faucet_request


class Command(BaseCommand):

    help = 'processes easy to process faucet requests so that admins dont have to.'

    def handle(self, *args, **options):
        reject_comments = "Please tell us what you're planning on using these funds for in the comments section!  Thanks."
        requests = FaucetRequest.objects.filter(rejected=False, fulfilled=False, comment='')
        for faucet_request in requests:
            faucet_request.comment_admin = reject_comments
            faucet_request.rejected = True
            faucet_request.save()
            reject_faucet_request(faucet_request)
            print(faucet_request.pk)
