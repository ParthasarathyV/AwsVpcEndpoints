#!/bin/bash

# Connection string (replace with yours)
CONN="mongodb+srv://<user>:<pass>@<cluster>/test?retryWrites=true&w=majority"
COLL="financialLevel3"
ID="ObjectId('YOUR_OBJECT_ID_HERE')"

for i in {1..100}; do
  (
    # Generate random values
    monthIndex=$((RANDOM % 12))
    appIndex=$((RANDOM % 4)) # assuming avg 4 apps per month, adjust as needed
    randVal=$(awk "BEGIN { printf \"%.4f\n\", $RANDOM/32767 * 0.2 }")
    path="months.${monthIndex}.application.${appIndex}.ip_cap_percent"

    mongosh "$CONN" --eval "
      const id = $ID;
      const path = '$path';
      const val = $randVal;
      const update = { \$set: { [path]: val } };
      const res = db.$COLL.updateOne({ _id: id }, update);
      print('[$i] ' + path + ' => ' + val + ' | matched=' + res.matchedCount + ', modified=' + res.modifiedCount);
    " &
  )
done

wait
