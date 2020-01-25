# -*- coding: utf-8 -*-
"""Define the is_in_list template tag to allow if in list checking in templates.

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
import re

from django import template

register = template.Library()


@register.filter
def matches(text, pattern):
    """Determine whether or not the value matches regex pattern.

        Args:
            value: Any value.
            pattern : Regex pattern against which the text is matched.

        Usage:
            {% if '<text>'|matches:'^/explorer$' %}

        Returns:
            bool: Whether or not the value matches the pattern.

    """

    if re.match(pattern, text):
        return True
    return False
