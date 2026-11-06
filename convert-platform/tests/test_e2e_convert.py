from io import BytesIO

from PIL import Image


def _png_bytes() -> bytes:
    buf = BytesIO()
    Image.new("RGB", (8, 8), color=(255, 0, 0)).save(buf, format="PNG")
    return buf.getvalue()


def test_png_to_jpg_flow(client):
    r = client.post("/v1/batches", json={})
    assert r.status_code == 201
    batch_id = r.json()["batch_id"]

    png = _png_bytes()
    r = client.post(
        f"/v1/batches/{batch_id}/files",
        files={"files": ("sample.png", png, "image/png")},
        data={"targets": '["jpg"]'},
    )
    assert r.status_code == 201
    body = r.json()
    assert len(body["accepted"]) == 1
    file_id = body["accepted"][0]["file_id"]

    r = client.get(f"/v1/batches/{batch_id}")
    assert r.status_code == 200
    detail = r.json()
    assert detail["summary"]["success"] == 1
    assert detail["files"][0]["status"] == "SUCCESS"

    r = client.get(f"/v1/files/{file_id}/download")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("image/")
    assert len(r.content) > 100
    assert r.content[:2] == b"\xff\xd8"


def test_unsupported_pair(client):
    r = client.post("/v1/batches", json={})
    batch_id = r.json()["batch_id"]
    png = _png_bytes()
    r = client.post(
        f"/v1/batches/{batch_id}/files",
        files={"files": ("sample.png", png, "image/png")},
        data={"targets": '["pdf"]'},
    )
    assert r.status_code == 201
    assert r.json()["rejected"]
