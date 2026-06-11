"""Tests for /api/social/* endpoints (sosmed feature).

Covers:
- User upsert (POST /api/social/users) — create + update same id
- Profile stats (GET /api/social/users/{id})
- Post create / list / delete (with auth-by-userId)
- Follow / unfollow / check (idempotency, self-follow guard)
- Feed (own + followed) and Discover (excludes self)
"""
import uuid
import pytest
import requests


def _u(name_suffix: str) -> dict:
    """Return a unique TEST_ user payload."""
    uid = f"TEST_u_{uuid.uuid4().hex[:8]}_{name_suffix}"
    return {"id": uid, "nickname": f"TEST_{name_suffix}", "avatar": "🍳", "bio": ""}


def _snap(title: str = "TEST_Recipe") -> dict:
    return {
        "title": title,
        "image": None,
        "category": "Sarapan",
        "cookTime": 15,
        "servings": 2,
        "difficulty": "Mudah",
    }


@pytest.fixture
def created_users(base_url, api_client):
    """Create two TEST users; cleanup their posts + follows + user docs after test."""
    a = _u("alpha")
    b = _u("beta")
    for p in (a, b):
        r = api_client.post(f"{base_url}/api/social/users", json=p)
        assert r.status_code == 200, r.text
    yield a, b
    # cleanup: posts, follows, users
    from pymongo import MongoClient  # local import to avoid module-level dependency
    import os
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "test_database")
    mc = MongoClient(mongo_url)
    db = mc[db_name]
    db.social_posts.delete_many({"userId": {"$in": [a["id"], b["id"]]}})
    db.social_follows.delete_many({"$or": [
        {"followerId": {"$in": [a["id"], b["id"]]}},
        {"followedId": {"$in": [a["id"], b["id"]]}},
    ]})
    db.social_users.delete_many({"id": {"$in": [a["id"], b["id"]]}})
    mc.close()


# ---------- Users ----------

class TestSocialUsers:
    def test_upsert_create(self, base_url, api_client):
        payload = _u("create")
        r = api_client.post(f"{base_url}/api/social/users", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["id"] == payload["id"]
        assert d["nickname"] == payload["nickname"]
        assert d["avatar"] == "🍳"
        assert "createdAt" in d
        # cleanup
        api_client.delete(f"{base_url}/api/social/users/{payload['id']}")  # may 404; ignore

    def test_upsert_updates_same_id(self, base_url, api_client):
        payload = _u("upd")
        api_client.post(f"{base_url}/api/social/users", json=payload).raise_for_status()
        payload2 = {**payload, "nickname": "TEST_renamed", "avatar": "🥗", "bio": "halo"}
        r = api_client.post(f"{base_url}/api/social/users", json=payload2)
        assert r.status_code == 200
        d = r.json()
        assert d["nickname"] == "TEST_renamed"
        assert d["avatar"] == "🥗"
        assert d["bio"] == "halo"
        # GET profile stats verifies persistence
        g = api_client.get(f"{base_url}/api/social/users/{payload['id']}")
        assert g.status_code == 200
        assert g.json()["user"]["nickname"] == "TEST_renamed"

    def test_empty_nickname_rejected(self, base_url, api_client):
        r = api_client.post(f"{base_url}/api/social/users", json={
            "id": "TEST_empty", "nickname": "   ", "avatar": "🍳",
        })
        assert r.status_code == 400

    def test_profile_404(self, base_url, api_client):
        r = api_client.get(f"{base_url}/api/social/users/TEST_does_not_exist_xyz")
        assert r.status_code == 404


# ---------- Posts ----------

class TestSocialPosts:
    def test_create_and_list_post(self, base_url, api_client, created_users):
        a, _ = created_users
        payload = {"userId": a["id"], "caption": "TEST yum", "recipe": _snap("TEST_dish")}
        r = api_client.post(f"{base_url}/api/social/posts", json=payload)
        assert r.status_code == 200, r.text
        post = r.json()
        assert post["userId"] == a["id"]
        assert post["caption"] == "TEST yum"
        assert post["recipe"]["title"] == "TEST_dish"
        assert post["user"]["nickname"] == a["nickname"]
        # GET to verify persistence
        g = api_client.get(f"{base_url}/api/social/users/{a['id']}/posts")
        assert g.status_code == 200
        ids = [p["id"] for p in g.json()]
        assert post["id"] in ids
        # stats reflect count
        stats = api_client.get(f"{base_url}/api/social/users/{a['id']}").json()
        assert stats["posts"] >= 1

    def test_create_post_unknown_user_404(self, base_url, api_client):
        r = api_client.post(f"{base_url}/api/social/posts", json={
            "userId": "TEST_ghost_user", "caption": "", "recipe": _snap(),
        })
        assert r.status_code == 404

    def test_delete_post_owner_only(self, base_url, api_client, created_users):
        a, b = created_users
        r = api_client.post(f"{base_url}/api/social/posts", json={
            "userId": a["id"], "caption": "", "recipe": _snap("toDelete"),
        })
        pid = r.json()["id"]
        # b tries to delete a's post
        forbidden = api_client.delete(f"{base_url}/api/social/posts/{pid}?userId={b['id']}")
        assert forbidden.status_code == 403
        # a deletes own post
        ok = api_client.delete(f"{base_url}/api/social/posts/{pid}?userId={a['id']}")
        assert ok.status_code == 200
        assert ok.json() == {"ok": True}
        # verify gone
        again = api_client.delete(f"{base_url}/api/social/posts/{pid}?userId={a['id']}")
        assert again.status_code == 404


# ---------- Follows / Feed / Discover ----------

class TestFollowsFeedDiscover:
    def test_self_follow_rejected(self, base_url, api_client, created_users):
        a, _ = created_users
        r = api_client.post(f"{base_url}/api/social/follows", json={
            "followerId": a["id"], "followedId": a["id"],
        })
        assert r.status_code == 400

    def test_follow_idempotent_and_check(self, base_url, api_client, created_users):
        a, b = created_users
        # initially not following
        chk = api_client.get(
            f"{base_url}/api/social/follows/check?followerId={a['id']}&followedId={b['id']}"
        ).json()
        assert chk["following"] is False
        # follow twice → idempotent
        r1 = api_client.post(f"{base_url}/api/social/follows",
                             json={"followerId": a["id"], "followedId": b["id"]})
        r2 = api_client.post(f"{base_url}/api/social/follows",
                             json={"followerId": a["id"], "followedId": b["id"]})
        assert r1.status_code == 200 and r2.status_code == 200
        # stats: b has 1 follower
        stats_b = api_client.get(f"{base_url}/api/social/users/{b['id']}").json()
        assert stats_b["followers"] == 1
        stats_a = api_client.get(f"{base_url}/api/social/users/{a['id']}").json()
        assert stats_a["following"] == 1
        chk2 = api_client.get(
            f"{base_url}/api/social/follows/check?followerId={a['id']}&followedId={b['id']}"
        ).json()
        assert chk2["following"] is True
        # unfollow
        api_client.delete(
            f"{base_url}/api/social/follows?followerId={a['id']}&followedId={b['id']}"
        )
        chk3 = api_client.get(
            f"{base_url}/api/social/follows/check?followerId={a['id']}&followedId={b['id']}"
        ).json()
        assert chk3["following"] is False

    def test_feed_includes_own_and_followed(self, base_url, api_client, created_users):
        a, b = created_users
        # b posts something
        api_client.post(f"{base_url}/api/social/posts", json={
            "userId": b["id"], "caption": "TEST b post", "recipe": _snap("B_recipe"),
        }).raise_for_status()
        # a posts something
        api_client.post(f"{base_url}/api/social/posts", json={
            "userId": a["id"], "caption": "TEST a post", "recipe": _snap("A_recipe"),
        }).raise_for_status()
        # Before follow: a's feed should NOT contain b's post (but contains own)
        feed = api_client.get(f"{base_url}/api/social/feed?userId={a['id']}").json()
        user_ids = {p["userId"] for p in feed}
        assert a["id"] in user_ids
        assert b["id"] not in user_ids
        # Follow b → b's posts should appear
        api_client.post(f"{base_url}/api/social/follows",
                        json={"followerId": a["id"], "followedId": b["id"]}).raise_for_status()
        feed2 = api_client.get(f"{base_url}/api/social/feed?userId={a['id']}").json()
        user_ids2 = {p["userId"] for p in feed2}
        assert b["id"] in user_ids2
        assert a["id"] in user_ids2

    def test_discover_excludes_self(self, base_url, api_client, created_users):
        a, b = created_users
        api_client.post(f"{base_url}/api/social/posts", json={
            "userId": a["id"], "caption": "", "recipe": _snap("A_disc"),
        }).raise_for_status()
        api_client.post(f"{base_url}/api/social/posts", json={
            "userId": b["id"], "caption": "", "recipe": _snap("B_disc"),
        }).raise_for_status()
        disc = api_client.get(f"{base_url}/api/social/discover?userId={a['id']}").json()
        user_ids = {p["userId"] for p in disc}
        assert a["id"] not in user_ids
        # b's post should be among results (may also include other TEST posts)
        # We only assert exclusion of self to keep this hermetic.

    def test_follow_unknown_user_404(self, base_url, api_client, created_users):
        a, _ = created_users
        r = api_client.post(f"{base_url}/api/social/follows", json={
            "followerId": a["id"], "followedId": "TEST_nope_xyz",
        })
        assert r.status_code == 404


class TestNewFeatures:
    def test_create_collage_single_image(self, base_url, api_client):
        img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        r = api_client.post(f"{base_url}/api/social/collage", json={"images": [img]})
        assert r.status_code == 200
        data = r.json()
        assert "image" in data
        assert data["image"].startswith("data:image/jpeg;base64,")

    def test_create_collage_multiple_images(self, base_url, api_client):
        img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        r = api_client.post(f"{base_url}/api/social/collage", json={"images": [img, img]})
        assert r.status_code == 200
        data = r.json()
        assert "image" in data
        assert data["image"].startswith("data:image/jpeg;base64,")

    def test_generate_caption_fallback(self, base_url, api_client):
        payload = {
            "title": "Nasi Goreng",
            "category": "Sarapan",
            "ingredients": ["Nasi", "Bawang Putih", "Telur"]
        }
        r = api_client.post(f"{base_url}/api/social/generate-caption", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert "caption" in data
        assert "Nasi Goreng" in data["caption"]
        assert len(data["caption"]) <= 280
