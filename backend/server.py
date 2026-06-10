from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import json
import logging
from pathlib import Path
from pydantic import BaseModel, HttpUrl
from typing import List, Optional
import requests
from bs4 import BeautifulSoup


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


class ImportRequest(BaseModel):
    url: str


class ImportedRecipe(BaseModel):
    title: str
    image: Optional[str] = None
    ingredients: List[str] = []
    instructions: List[str] = []
    cookTime: Optional[int] = None
    servings: Optional[int] = None


def _parse_iso_duration_minutes(value: str) -> Optional[int]:
    """Parse ISO 8601 duration like 'PT1H30M' to total minutes."""
    if not value or not isinstance(value, str):
        return None
    m = re.match(r"^P(?:T)?(?:(\d+)H)?(?:(\d+)M)?", value.strip())
    if not m:
        return None
    h = int(m.group(1) or 0)
    mn = int(m.group(2) or 0)
    total = h * 60 + mn
    return total or None


def _parse_int(value) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return int(value)
    m = re.search(r"\d+", str(value))
    return int(m.group(0)) if m else None


def _extract_text(item) -> Optional[str]:
    """Recipe instructions can be string, list of strings, list of HowToStep objects, or HowToSection."""
    if item is None:
        return None
    if isinstance(item, str):
        return item.strip() or None
    if isinstance(item, dict):
        if item.get("@type") == "HowToSection":
            steps = item.get("itemListElement") or []
            joined = "\n".join(filter(None, (_extract_text(s) for s in steps)))
            return joined or None
        text = item.get("text") or item.get("name")
        return _extract_text(text)
    if isinstance(item, list):
        return "\n".join(filter(None, (_extract_text(x) for x in item))) or None
    return None


def _flatten_instructions(raw) -> List[str]:
    if raw is None:
        return []
    if isinstance(raw, str):
        # Sometimes a single long string with line breaks
        parts = re.split(r"\r?\n+|(?<=[.!?])\s{2,}", raw)
        return [p.strip() for p in parts if p.strip()]
    if isinstance(raw, list):
        out: List[str] = []
        for item in raw:
            text = _extract_text(item)
            if not text:
                continue
            for line in text.split("\n"):
                line = line.strip()
                if line:
                    out.append(line)
        return out
    if isinstance(raw, dict):
        text = _extract_text(raw)
        return _flatten_instructions(text) if text else []
    return []


def _flatten_ingredients(raw) -> List[str]:
    if raw is None:
        return []
    if isinstance(raw, str):
        return [raw.strip()] if raw.strip() else []
    if isinstance(raw, list):
        return [str(x).strip() for x in raw if str(x).strip()]
    return []


def _pick_image(raw) -> Optional[str]:
    if raw is None:
        return None
    if isinstance(raw, str):
        return raw.strip() or None
    if isinstance(raw, list) and raw:
        return _pick_image(raw[0])
    if isinstance(raw, dict):
        return raw.get("url") or _pick_image(raw.get("contentUrl"))
    return None


def _find_recipe_node(data):
    """Walk JSON-LD payload (object / list / @graph) and return the first Recipe-typed node."""
    if isinstance(data, list):
        for d in data:
            found = _find_recipe_node(d)
            if found:
                return found
        return None
    if not isinstance(data, dict):
        return None
    t = data.get("@type")
    types = t if isinstance(t, list) else [t]
    if "Recipe" in types:
        return data
    if "@graph" in data:
        return _find_recipe_node(data["@graph"])
    return None


@api_router.get("/")
async def root():
    return {"message": "RecipeVault API"}


@api_router.post("/recipes/import", response_model=ImportedRecipe)
async def import_recipe(payload: ImportRequest):
    url = payload.url.strip()
    if not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(status_code=400, detail="URL harus diawali http:// atau https://")

    try:
        resp = requests.get(
            url,
            timeout=12,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (compatible; RecipeVaultBot/1.0; +https://recipevault.app)"
                )
            },
        )
        resp.raise_for_status()
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Gagal mengambil halaman: {e}") from e

    soup = BeautifulSoup(resp.text, "html.parser")

    # 1. Walk every JSON-LD block looking for a Recipe node.
    recipe_node = None
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        if not script.string:
            continue
        try:
            data = json.loads(script.string)
        except json.JSONDecodeError:
            # Some sites embed multiple JSON objects in one block.
            try:
                data = json.loads(script.string.strip().rstrip(";"))
            except json.JSONDecodeError:
                continue
        recipe_node = _find_recipe_node(data)
        if recipe_node:
            break

    title: Optional[str] = None
    image: Optional[str] = None
    ingredients: List[str] = []
    instructions: List[str] = []
    cook_time: Optional[int] = None
    servings: Optional[int] = None

    if recipe_node:
        title = recipe_node.get("name")
        image = _pick_image(recipe_node.get("image"))
        ingredients = _flatten_ingredients(recipe_node.get("recipeIngredient"))
        instructions = _flatten_instructions(recipe_node.get("recipeInstructions"))
        cook_time = (
            _parse_iso_duration_minutes(recipe_node.get("totalTime"))
            or _parse_iso_duration_minutes(recipe_node.get("cookTime"))
            or _parse_iso_duration_minutes(recipe_node.get("prepTime"))
        )
        servings = _parse_int(recipe_node.get("recipeYield"))

    # 2. Fallbacks via OpenGraph / <title>
    if not title:
        og = soup.find("meta", attrs={"property": "og:title"})
        title = (og.get("content") if og else None) or (soup.title.string if soup.title else None)
    if not image:
        og_img = soup.find("meta", attrs={"property": "og:image"})
        if og_img and og_img.get("content"):
            image = og_img["content"]

    if not title:
        raise HTTPException(
            status_code=422,
            detail="Tidak menemukan resep di halaman ini. Coba URL lain.",
        )

    return ImportedRecipe(
        title=title.strip(),
        image=image,
        ingredients=ingredients,
        instructions=instructions,
        cookTime=cook_time,
        servings=servings,
    )


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
