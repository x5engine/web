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

from marketing.mails import notify_deadbeat_quest


class Command(BaseCommand):

    help = 'finds quests whose reward is out of redemptions'

    def handle(self, *args, **options):
        from quests.models import Quest

        for quest in Quest.objects.filter(visible=True):
            if quest.kudos_reward and quest.kudos_reward.num_clones_available_counting_indirect_send < 0:
                print(quest.url)
                notify_deadbeat_quest(quest)
