import urllib.request
import json

try:
    with urllib.request.urlopen('http://localhost:5000/api/leads') as response:
        data = json.loads(response.read().decode())
        if len(data) > 0:
            lead = data[0]
            print("First Lead:")
            print(f"  ID: {lead.get('id')}")
            print(f"  Name: {lead.get('name')}")
            print(f"  Company: {lead.get('company_name')}")
            print(f"  Owner First Name: {lead.get('owner_first_name')}")
            print(f"  Owner Last Name: {lead.get('owner_last_name')}")
            print(f"  Owner Avatar: {'Present' if lead.get('owner_avatar') else 'Missing'}")
        else:
            print("No leads found")
except Exception as e:
    print(f"Error: {e}")
