#!/bin/bash

set -e

PROXY_HOST="localhost"
PROXY_PORT="8888"
DATA_DIR="data"

SOURCE_NAME=${1}

if [ ! -f ./sources/${SOURCE_NAME}.txt ]; then
    echo "${SOURCE_NAME} not found, please add a list of twitter handles to sources/${SOURCE_NAME}.txt to scrape"
    exit 1
fi

mkdir -p ${DATA_DIR}/${SOURCE_NAME}

USERS=()
while IFS= read -r line; do
  USERS+=("$line")
done < ./sources/${SOURCE_NAME}.txt


for u in "${USERS[@]}"
do
   OUTPUT="${DATA_DIR}/${SOURCE_NAME}/${u}"
   twint --json --links exclude \
         --proxy-host ${PROXY_HOST} --proxy-port ${PROXY_PORT} --proxy-type HTTP \
         -u "${u}" -o "${OUTPUT}.json"

   # Filter the data based on the following heuristics:
   # 1. Any tweets that have more than one user in "reply_to", a proxy for
   #    whether a tweet is a reply to another tweet and requires context.
   # 2. Any tweets that have external URLs.
   #
   # jq can't edit in place so do a small file swqp.
   cat "${OUTPUT}.json" | jq -c 'select((.reply_to | length) == 1 and (.urls | length) == 0)' > "${OUTPUT}-cleaned.json"
   mv "${OUTPUT}-cleaned.json" "${OUTPUT}.json"
done
