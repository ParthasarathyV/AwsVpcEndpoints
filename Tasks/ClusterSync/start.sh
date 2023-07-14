Src=""
Dst=""

mongosync --cluster0 "${Src}" --cluster1 "${Dst}" --logPath logs &

sleep 5
echo "triggering start API."

curl -X POST --data '{ "source": "cluster0", "destination": "cluster1" }' "http://localhost:27182/api/v1/start"
