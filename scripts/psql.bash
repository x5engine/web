#!/bin/bash

: <<'END'
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
END

apk --update add postgresql-client

export $(grep -v '^#' app/app/.env | xargs)


# Settings
PGUSER=$(echo $DATABASE_URL | awk -F '://' '{print $2}'  | awk -F ':' '{print $1}')
PGHOST=$(echo $DATABASE_URL | awk -F '://' '{print $2}'  | awk -F ':' '{print $2}'  | awk -F '@' '{print $2}')
PGPORT=$(echo $DATABASE_URL | awk -F '://' '{print $2}'  | awk -F ':' '{print $3}'  | awk -F ':' '{print $1}' | awk -F '/' '{print $1}')
PGPASS=$(echo $DATABASE_URL | awk -F '://' '{print $2}'  | awk -F ':' '{print $2}' | awk -F '@' '{print $1}')
PGDB=gitcoin
PGDB=postgres

psql $PGDB -p $PGPORT -h $PGHOST -U $PGUSER
