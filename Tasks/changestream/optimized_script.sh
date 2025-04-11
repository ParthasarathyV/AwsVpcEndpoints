#!/bin/bash
set -e

# Function to run mongosh command with error handling
run_mongosh_command() {
    local path="$1"
    local val="$2"
    local index="$3"
    
    # Add timestamp for logging
    local start_time=$(date +%s)
    
    echo "[START:$index] Processing update for $path at $(date '+%Y-%m-%d %H:%M:%S')"
    
    mongosh "mongodb+srv://<user>:<pass>@<cluster>/metadata?retryWrites=true&w=majority" --eval "
        try {
            const db = db.getSiblingDB('metadata');
            const id = ObjectId('YOUR_OBJECT_ID_HERE');
            const path = '$path';
            const val = $val;
            const update = { \$set: { [path]: val } };
            const res = db.appMappings.updateOne({ _id: id }, update);
            print('[UPDATE:$index] ' + path + ' => ' + val + ' | matched=' + res.matchedCount + ', modified=' + res.modifiedCount);
        } catch (error) {
            print('[ERROR:$index] Failed to update ' + '$path' + ': ' + error.message);
            quit(1);
        }
    " 2>&1 | tee -a update_log.txt
    
    local end_time=$(date +%s)
    echo "[END:$index] Completed in $((end_time-start_time)) seconds" | tee -a update_log.txt
}

# Export the function so it's available to parallel
export -f run_mongosh_command

# Create a log file
echo "Starting updates at $(date '+%Y-%m-%d %H:%M:%S')" > update_log.txt

# Create commands array
declare -a commands=(
    "months.1.application.0.ip_cap_percent 0.1346 1"
    "months.7.application.0.ip_cap_percent 0.1035 2"
    # ... existing commands array content ...
    "months.8.application.1.ip_cap_percent 0.0139 100"
)

# Set the number of parallel processes
PARALLEL_JOBS=10

echo "Running updates with $PARALLEL_JOBS parallel processes" | tee -a update_log.txt

# Run commands in parallel with progress tracking
printf "%s\n" "${commands[@]}" | parallel --progress --joblog parallel.log -j $PARALLEL_JOBS run_mongosh_command {}

# Check for any errors in parallel.log
if grep -q "Exit.*[1-9]" parallel.log; then
    echo "Some updates failed. Check update_log.txt for details." >&2
    exit 1
fi

echo "All updates completed successfully at $(date '+%Y-%m-%d %H:%M:%S')" | tee -a update_log.txt 