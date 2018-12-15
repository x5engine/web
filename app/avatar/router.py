import logging

import django_filters.rest_framework
from rest_framework import routers, viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Avatar
from .serializers import AvatarSerializer

logger = logging.getLogger(__name__)


class AvatarViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = AvatarSerializer
    filter_backends = (django_filters.rest_framework.DjangoFilterBackend,)
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        param_keys = self.request.query_params.keys()
        queryset = Avatar.objects.all().order_by('-id')

        if 'recommended_by_staff' in param_keys:
            queryset = queryset.filter(recommended_by_staff=self.request.query_params.get('recommended_by_staff'))

        if 'profile' in param_keys:
            queryset = queryset.filter(profile__pk=self.request.query_params.get('profile'))

        return queryset


router = routers.DefaultRouter()
router.register(r'avatars', AvatarViewSet, base_name="avatars")
