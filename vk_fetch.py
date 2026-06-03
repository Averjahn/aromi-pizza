#!/usr/bin/env python3
# Забирает все товары VK-маркета сообщества через официальный API.
# Запуск:  python3 vk_fetch.py <ACCESS_TOKEN>
# Результат: vk_market.json (названия, описания, цены, ссылки на фото).

import sys, json, time, urllib.request, urllib.parse

OWNER_ID = -211542240          # сообщество market-211542240
API_VERSION = "5.199"

def call(method, token, **params):
    params.update({"access_token": token, "v": API_VERSION})
    url = f"https://api.vk.com/method/{method}?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=30) as r:
        data = json.loads(r.read().decode())
    if "error" in data:
        raise SystemExit("Ошибка API: " + data["error"].get("error_msg", str(data["error"])))
    return data["response"]

def biggest_photo(item):
    # выбираем самое крупное изображение товара
    best = ""
    for ph in (item.get("photos") or []):
        sizes = sorted(ph.get("sizes", []), key=lambda s: s.get("width", 0))
        if sizes:
            best = sizes[-1]["url"]
            break
    if not best and item.get("thumb_photo"):
        best = item["thumb_photo"]
    return best

def main():
    if len(sys.argv) < 2:
        raise SystemExit("Использование: python3 vk_fetch.py <ACCESS_TOKEN>")
    token = sys.argv[1].strip()

    items, offset = [], 0
    while True:
        resp = call("market.get", token, owner_id=OWNER_ID, count=200,
                    offset=offset, extended=1)
        batch = resp.get("items", [])
        if not batch:
            break
        for it in batch:
            items.append({
                "id": it.get("id"),
                "title": it.get("title", "").strip(),
                "price": (it.get("price", {}) or {}).get("text", ""),
                "amount": (it.get("price", {}) or {}).get("amount", ""),
                "desc": (it.get("description", "") or "").strip(),
                "img": biggest_photo(it),
                "url": f"https://vk.com/market{OWNER_ID}?w=product{OWNER_ID}_{it.get('id')}",
            })
        offset += len(batch)
        if offset >= resp.get("count", 0):
            break
        time.sleep(0.34)   # бережём лимит запросов

    with open("vk_market.json", "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    print(f"Готово: сохранено {len(items)} товаров в vk_market.json")

if __name__ == "__main__":
    main()
