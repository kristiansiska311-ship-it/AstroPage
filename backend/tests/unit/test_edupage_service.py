"""edupage_service: e-test attachment parsing (no network)."""

import base64
import json
import urllib.parse
from types import SimpleNamespace

from app.services.edupage_service import (
    _collect_files,
    _edu_encode_body,
    _etest_files_blocking,
)


def test_edu_encode_body_roundtrips_to_base64_querystring():
    body = _edu_encode_body({"superid": "36216"})
    assert body.endswith("&eqaz=0")
    eqap = body.removeprefix("eqap=").removesuffix("&eqaz=0")
    decoded = base64.b64decode(urllib.parse.unquote(eqap)).decode()
    assert decoded == "superid=36216"


def test_collect_files_recurses_and_builds_urls():
    node = {
        "rows": [
            {
                "props": {
                    "files": [
                        {
                            "src": "/a/task.pdf",
                            "name": "task.pdf",
                            "type": "pdf",
                            "extension": "pdf",
                        }
                    ]
                }
            },
            {"nested": {"props": {"files": [{"src": "/b/diagram.png", "extension": "png"}]}}},
            {"props": {"files": "not-a-list"}},  # ignored
        ]
    }
    out = []
    _collect_files(node, "myschool", out)

    assert [a.url for a in out] == [
        "https://myschool.edupage.org/a/task.pdf",
        "https://myschool.edupage.org/b/diagram.png",
    ]
    # name falls back to the basename of src when absent.
    assert out[1].name == "diagram.png"


def test_etest_files_blocking_parses_cards_and_dedupes(monkeypatch):
    duplicate = {"src": "/x/shared.pdf", "name": "shared.pdf"}
    payload = {
        "materialData": {
            "cardsData": {
                # content as a JSON string (the common case) and as a dict.
                "c1": {"content": json.dumps({"props": {"files": [duplicate]}})},
                "c2": {
                    "content": {
                        "props": {
                            "files": [duplicate, {"src": "/x/extra.docx", "name": "extra.docx"}]
                        }
                    }
                },
                "c3": {"content": "not json"},  # skipped
            }
        }
    }

    class FakeResp:
        def raise_for_status(self):
            pass

        def json(self):
            return payload

    posted = {}

    def fake_post(url, data, headers):
        posted["url"] = url
        return FakeResp()

    edupage = SimpleNamespace(subdomain="myschool", session=SimpleNamespace(post=fake_post))

    files = _etest_files_blocking(edupage, "36216")

    assert "EtestCreator" in posted["url"]
    # shared.pdf appears twice across cards but is de-duplicated by url.
    assert [f.name for f in files] == ["shared.pdf", "extra.docx"]
