"""Tests for POST /api/recipes/import (Bahasa Indonesia recipe import endpoint)."""
import pytest


class TestImportEndpoint:
    # Happy path: fixture page with JSON-LD Recipe
    def test_import_valid_fixture(self, api_client, base_url, fixture_server):
        r = api_client.post(
            f"{base_url}/api/recipes/import",
            json={"url": fixture_server["recipe_url"]},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["title"] == "Nasi Goreng Spesial"
        assert data["image"] == "https://example.com/nasi-goreng.jpg"
        assert len(data["ingredients"]) == 4
        assert len(data["instructions"]) == 4
        assert data["cookTime"] == 30
        assert data["servings"] == 4
        # spot-check Indonesian content survived parsing
        assert "nasi" in data["ingredients"][0].lower()

    # Invalid URL string
    def test_import_invalid_url_returns_400_indonesian(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/recipes/import",
            json={"url": "not-a-url"},
        )
        assert r.status_code == 400, r.text
        detail = r.json().get("detail", "")
        assert "http://" in detail or "https://" in detail
        # Indonesian phrasing
        assert "harus" in detail.lower() or "diawali" in detail.lower()

    # Valid URL but no recipe data -> 422 Indonesian
    def test_import_no_recipe_returns_422_indonesian(self, api_client, base_url, fixture_server):
        r = api_client.post(
            f"{base_url}/api/recipes/import",
            json={"url": fixture_server["empty_url"]},
        )
        assert r.status_code == 422, r.text
        detail = r.json().get("detail", "")
        assert "Tidak menemukan resep" in detail

    # Edge: blank URL
    def test_import_blank_url(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/recipes/import",
            json={"url": ""},
        )
        assert r.status_code == 400

    # Edge: missing url field -> FastAPI returns 422 validation error
    def test_import_missing_url(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/recipes/import", json={})
        assert r.status_code == 422


class TestHealth:
    def test_root(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/")
        assert r.status_code == 200
        assert r.json().get("message")
