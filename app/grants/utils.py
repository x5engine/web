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
import os
from secrets import token_hex

from eth_utils import to_checksum_address
from web3 import HTTPProvider, Web3

from grants.abi import subscription_abi

logger = logging.getLogger(__name__)


def get_upload_filename(instance, filename):
    salt = token_hex(16)
    file_path = os.path.basename(filename)
    return f"grants/{getattr(instance, '_path', '')}/{salt}/{file_path}"


def get_http_web3(network, uri=''):
    """Get a Web3 session for the provided network.

    Attributes:
        network (str): The network to establish a session with.

    Raises:
        UnsupportedNetworkException: The exception is raised if the method
            is passed an invalid network.

    Returns:
        web3.main.Web3: A web3 instance for the provided network.

    """
    try:
        if not uri and network in ['mainnet', 'rinkeby', 'ropsten']:
            return Web3(HTTPProvider(f'https://{network}.infura.io'))

        return Web3(HTTPProvider(uri))
    except Exception as e:
        logger.error(e)
        return None


# def get_ws_web3(network):
#     """Get a web3 connection over WSS."""
#     try:
#         return Web3(WebsocketProvider("wss://{network}.infura.io/ws", websocket_kwargs={'timeout': 60}))
#     except Exception as e:
#         logger.error(e)
#         return None


def get_subscription_contract(contract_address, network):
    web3 = get_http_web3(network)
    if web3:
        contract_address = to_checksum_address(contract_address)
        sub_abi = subscription_abi()
        return web3.eth.contract(contract_address, abi=sub_abi)
    return None
