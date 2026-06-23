import requests
import urllib.parse

locations = ["Galle Fort", "Arugam Bay", "Aranayake"]

for loc in locations:
    query = f'"{loc}" Sri Lanka'
    url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(query)}&utf8=&format=json"
    res = requests.get(url).json()
    hits = len(res.get('query', {}).get('search', []))
    print(f"Query '{query}' found {hits} results.")
    
    query2 = f'{loc} Sri Lanka'
    url2 = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(query2)}&utf8=&format=json"
    res2 = requests.get(url2).json()
    hits2 = len(res2.get('query', {}).get('search', []))
    print(f"Query '{query2}' found {hits2} results.")
    
    query3 = f'{loc} Sri Lanka disaster OR tsunami OR flood'
    url3 = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(query3)}&utf8=&format=json"
    res3 = requests.get(url3).json()
    hits3 = len(res3.get('query', {}).get('search', []))
    print(f"Query '{query3}' found {hits3} results.")
