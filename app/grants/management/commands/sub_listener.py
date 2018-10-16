# -*- coding: utf-8 -*-
"""Define the Grant utilities.

Copyright (C) 2018 Gitcoin Core

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
import logging

from grants.models import Grant

from grants.utils import get_subscription_contract, get_http_web3

logger = logging.getLogger(__name__)


LOOK_BACK = 16

WEB3 = get_http_web3('rinkeby')


def get_current_block():
    """Get the latest block."""
    try:
        return WEB3.eth.getBlock('latest')
    except Exception as e:
        logger.error(e)
        return 0


def get_grants(network='mainnet'):
    """Get all Gitcoin grants."""
    try:
        return Grant.objects.filter(active=True)
    except Exception as e:
        logger.error(e)
        return Grant.objects.none()


def get_past_events(grant, event_filter=''):
    event_kwargs = {}
    if event_filter:
        event_kwargs.update({'argument_filters': event_filter})
    contract = get_subscription_contract(grant.contract_address, grant.network)
