import time

from app.redis_service import RedisService
from celery import app
from celery.utils.log import get_task_logger
from dashboard.utils import get_web3
from hexbytes import HexBytes
from kudos.models import KudosTransfer, TokenRequest

logger = get_task_logger(__name__)

redis = RedisService().redis

# Lock timeout of 2 minutes (just in the case that the application hangs to avoid a redis deadlock)
LOCK_TIMEOUT = 60 * 2


@app.shared_task(bind=True, max_retries=3)
def mint_token_request(self, token_req_id, retry=False):
    """
    :param self:
    :param token_req_id:
    :return:
    """
    with redis.lock("tasks:token_req_id:%s" % token_req_id, timeout=LOCK_TIMEOUT):
        from kudos.management.commands.mint_all_kudos import sync_latest
        from dashboard.utils import has_tx_mined
        obj = TokenRequest.objects.get(pk=token_req_id)
        tx_id = obj.mint()
        if tx_id:
            while not has_tx_mined(tx_id, obj.network):
                time.sleep(1)
            sync_latest(0)
            sync_latest(1)
            sync_latest(2)
            sync_latest(3)
        else:
            self.retry(30)


@app.shared_task(bind=True, max_retries=3)
def redeem_bulk_kudos(self, kt_id, signed_rawTransaction, retry=False):
    """
    :param self:
    :param kt_id:
    :param signed_rawTransaction:
    :return:
    """
    with redis.lock("tasks:redeem_bulk_kudos:%s" % kt_id, timeout=LOCK_TIMEOUT):
        try:
            obj = KudosTransfer.objects.get(pk=kt_id)
            w3 = get_web3(obj.network)
            obj.txid = w3.eth.sendRawTransaction(HexBytes(signed_rawTransaction)).hex()
            obj.receive_txid = obj.txid
            obj.save()
            pass
        except Exception as e:
            self.retry(30)
