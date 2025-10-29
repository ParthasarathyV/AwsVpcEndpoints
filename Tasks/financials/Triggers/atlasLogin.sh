# useful commands
atlas config set public_api_key $x
atlas config set private_api_key $y
atlas config set org_id $a
atlas config set project_id $b

npm install -g atlas-app-services-cli
appservices login --api-key $x --private-api-key $y

mongodb+srv://$z?retryWrites=true&w=majority&appName=TriggerTester