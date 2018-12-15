from rest_framework import serializers

from .models import Avatar


class AvatarSerializer(serializers.ModelSerializer):
    """Handle serializing the Avatar object."""

    class Meta:
        """Define the milestone serializer metadata."""

        model = Avatar
        fields = ('pk', 'avatar_url', 'active')
