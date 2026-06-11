from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.responses import HTMLResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import json
import logging
import base64
import io
from pathlib import Path
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
import requests
from bs4 import BeautifulSoup
from PIL import Image


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---------- Import-from-URL (existing) ----------
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

    recipe_node = None
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        if not script.string:
            continue
        try:
            data = json.loads(script.string)
        except json.JSONDecodeError:
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


# ---------- SOSMED / SOCIAL ----------

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class SocialUser(BaseModel):
    id: str
    nickname: str
    avatar: str  # emoji or short text
    bio: Optional[str] = ""
    createdAt: str = Field(default_factory=_now_iso)


class SocialUserUpsert(BaseModel):
    id: str
    nickname: str
    avatar: str
    bio: Optional[str] = ""


class RecipeSnapshot(BaseModel):
    title: str
    image: Optional[str] = None
    category: str
    cookTime: int
    servings: int
    difficulty: str


class PostCreate(BaseModel):
    userId: str
    caption: Optional[str] = ""
    recipe: RecipeSnapshot


class Post(BaseModel):
    id: str
    userId: str
    user: SocialUser
    recipe: RecipeSnapshot
    caption: str = ""
    createdAt: str


class FollowAction(BaseModel):
    followerId: str
    followedId: str


class ProfileStats(BaseModel):
    user: SocialUser
    posts: int
    followers: int
    following: int


async def _user_or_404(user_id: str) -> SocialUser:
    raw = await db.social_users.find_one({"id": user_id}, {"_id": 0})
    if not raw:
        raise HTTPException(status_code=404, detail="Dapur tidak ditemukan.")
    return SocialUser(**raw)


def _post_doc_to_model(doc: dict, user: SocialUser) -> Post:
    return Post(
        id=doc["id"],
        userId=doc["userId"],
        user=user,
        recipe=RecipeSnapshot(**doc["recipe"]),
        caption=doc.get("caption") or "",
        createdAt=doc["createdAt"],
    )


@api_router.post("/social/users", response_model=SocialUser)
async def upsert_user(payload: SocialUserUpsert):
    nickname = payload.nickname.strip()
    if not nickname:
        raise HTTPException(status_code=400, detail="Nama dapur wajib diisi.")
    if len(nickname) > 32:
        raise HTTPException(status_code=400, detail="Nama dapur maksimal 32 karakter.")

    existing = await db.social_users.find_one({"id": payload.id}, {"_id": 0})
    if existing:
        update = {
            "nickname": nickname,
            "avatar": payload.avatar,
            "bio": (payload.bio or "").strip()[:160],
        }
        await db.social_users.update_one({"id": payload.id}, {"$set": update})
        return SocialUser(**{**existing, **update})

    user = SocialUser(
        id=payload.id,
        nickname=nickname,
        avatar=payload.avatar,
        bio=(payload.bio or "").strip()[:160],
    )
    await db.social_users.insert_one(user.model_dump())
    return user


@api_router.get("/social/users/{user_id}", response_model=ProfileStats)
async def get_profile(user_id: str):
    user = await _user_or_404(user_id)
    posts = await db.social_posts.count_documents({"userId": user_id})
    followers = await db.social_follows.count_documents({"followedId": user_id})
    following = await db.social_follows.count_documents({"followerId": user_id})
    return ProfileStats(user=user, posts=posts, followers=followers, following=following)


@api_router.get("/social/users/{user_id}/posts", response_model=List[Post])
async def get_user_posts(user_id: str, limit: int = Query(50, le=100)):
    user = await _user_or_404(user_id)
    cursor = (
        db.social_posts.find({"userId": user_id}, {"_id": 0})
        .sort("createdAt", -1)
        .limit(limit)
    )
    return [_post_doc_to_model(doc, user) async for doc in cursor]


@api_router.post("/social/posts", response_model=Post)
async def create_post(payload: PostCreate):
    user = await _user_or_404(payload.userId)
    caption = (payload.caption or "").strip()[:280]
    post_doc = {
        "id": str(uuid.uuid4()),
        "userId": payload.userId,
        "recipe": payload.recipe.model_dump(),
        "caption": caption,
        "createdAt": _now_iso(),
    }
    await db.social_posts.insert_one(post_doc.copy())
    return _post_doc_to_model(post_doc, user)


@api_router.delete("/social/posts/{post_id}")
async def delete_post(post_id: str, userId: str = Query(...)):
    post = await db.social_posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post tidak ditemukan.")
    if post["userId"] != userId:
        raise HTTPException(status_code=403, detail="Hanya pemilik yang dapat menghapus post ini.")
    await db.social_posts.delete_one({"id": post_id})
    return {"ok": True}


async def _hydrate_posts(docs: List[dict]) -> List[Post]:
    if not docs:
        return []
    user_ids = list({d["userId"] for d in docs})
    user_cursor = db.social_users.find({"id": {"$in": user_ids}}, {"_id": 0})
    users_by_id = {u["id"]: SocialUser(**u) async for u in user_cursor}
    out: List[Post] = []
    for d in docs:
        u = users_by_id.get(d["userId"])
        if not u:
            continue
        out.append(_post_doc_to_model(d, u))
    return out


@api_router.get("/social/feed", response_model=List[Post])
async def get_feed(userId: str = Query(...), limit: int = Query(30, le=100)):
    following_cursor = db.social_follows.find({"followerId": userId}, {"_id": 0, "followedId": 1})
    following_ids = [f["followedId"] async for f in following_cursor]
    # Always include own posts so the feed never feels empty for a new user.
    target_ids = list({*following_ids, userId})
    cursor = (
        db.social_posts.find({"userId": {"$in": target_ids}}, {"_id": 0})
        .sort("createdAt", -1)
        .limit(limit)
    )
    docs = [d async for d in cursor]
    return await _hydrate_posts(docs)


@api_router.get("/social/discover", response_model=List[Post])
async def discover(userId: Optional[str] = None, limit: int = Query(30, le=100)):
    query = {"userId": {"$ne": userId}} if userId else {}
    cursor = (
        db.social_posts.find(query, {"_id": 0}).sort("createdAt", -1).limit(limit)
    )
    docs = [d async for d in cursor]
    return await _hydrate_posts(docs)


@api_router.post("/social/follows")
async def follow(payload: FollowAction):
    if payload.followerId == payload.followedId:
        raise HTTPException(status_code=400, detail="Tidak bisa mengikuti diri sendiri.")
    await _user_or_404(payload.followedId)
    existing = await db.social_follows.find_one(
        {"followerId": payload.followerId, "followedId": payload.followedId},
        {"_id": 0},
    )
    if existing:
        return {"following": True}
    await db.social_follows.insert_one(
        {
            "followerId": payload.followerId,
            "followedId": payload.followedId,
            "createdAt": _now_iso(),
        }
    )
    return {"following": True}


@api_router.delete("/social/follows")
async def unfollow(followerId: str = Query(...), followedId: str = Query(...)):
    await db.social_follows.delete_one(
        {"followerId": followerId, "followedId": followedId}
    )
    return {"following": False}


@api_router.get("/social/follows/check")
async def check_follow(followerId: str = Query(...), followedId: str = Query(...)):
    existing = await db.social_follows.find_one(
        {"followerId": followerId, "followedId": followedId},
        {"_id": 0},
    )
    return {"following": existing is not None}


# ---------- COLLAGE & CAPTION (NEW) ----------

class CollageRequest(BaseModel):
    images: List[str]


class GenerateCaptionRequest(BaseModel):
    title: str
    category: str
    ingredients: List[str]
    apiKey: Optional[str] = None
    aiModel: Optional[str] = None


@api_router.post("/social/collage")
async def create_collage(payload: CollageRequest):
    if not payload.images:
        raise HTTPException(status_code=400, detail="Daftar gambar tidak boleh kosong.")
    
    pil_images = []
    for img_b64 in payload.images:
        if "," in img_b64:
            img_b64 = img_b64.split(",")[1]
        try:
            img_data = base64.b64decode(img_b64)
            img = Image.open(io.BytesIO(img_data))
            pil_images.append(img)
        except Exception as e:
            continue
            
    if not pil_images:
        raise HTTPException(status_code=400, detail="Tidak ada gambar valid yang berhasil diurai.")
        
    if len(pil_images) == 1:
        # Single image fallback
        buffered = io.BytesIO()
        pil_images[0].convert("RGB").save(buffered, format="JPEG")
        b64_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        return {"image": f"data:image/jpeg;base64,{b64_str}"}

    target_size = 400
    resized = []
    for img in pil_images:
        resized.append(img.convert("RGB").resize((target_size, target_size), Image.Resampling.LANCZOS))

    if len(resized) == 2:
        # Horizontal collage (800x400)
        collage = Image.new("RGB", (target_size * 2, target_size), "#F4EFE6")
        collage.paste(resized[0], (0, 0))
        collage.paste(resized[1], (target_size, 0))
    else:
        # 2x2 grid (800x800)
        collage = Image.new("RGB", (target_size * 2, target_size * 2), "#F4EFE6")
        collage.paste(resized[0], (0, 0))
        collage.paste(resized[1], (target_size, 0))
        collage.paste(resized[2], (0, target_size))
        if len(resized) >= 4:
            collage.paste(resized[3], (target_size, target_size))

    buffered = io.BytesIO()
    collage.save(buffered, format="JPEG", quality=85)
    b64_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return {"image": f"data:image/jpeg;base64,{b64_str}"}


CAPTION_TEMPLATES = [
    "Wah, hari ini sukses bikin {title}! Kategori {category} yang pas banget di lidah. Bahannya simpel aja: {ingredients}. Siapa yang mau coba bikin juga? 🤤👩‍🍳 #MasakHariIni #RecipeVault",
    "Menu {category} kali ini: {title}. Rasanya bener-bener juara dan bikin nagih! ✨ Gampang banget dibuat dengan bahan: {ingredients}. Cobain yuk di dapur kalian! 🍳🥘 #DapurLokal",
    "Gak perlu ribet buat makan enak! Cobain resep {title} ini untuk hidangan {category} spesial Anda. Cukup siapkan {ingredients}. Selamat mencoba! 💕🍲",
    "Masak {title} buat keluarga tercinta hari ini. Hasilnya wangi banget dan rasanya dapet banget! Cocok buat ide menu {category}. Bahannya: {ingredients}. Happy cooking! 🥰✨",
    "Lagi pengen {category} yang beda? Bikin {title} aja! Kombinasi bahan {ingredients} bener-bener menyatu sempurna. Yuk, simpan resepnya dan langsung praktek! 👩‍🍳🥗"
]


@api_router.post("/social/generate-caption")
async def generate_caption(payload: GenerateCaptionRequest):
    ingredients_str = ", ".join(payload.ingredients[:5])
    if len(payload.ingredients) > 5:
        ingredients_str += f", dan {len(payload.ingredients) - 5} bahan lainnya"

    api_key = (payload.apiKey or os.environ.get("GEMINI_API_KEY", "")).strip()
    model_name = (payload.aiModel or "gemini-2.5-flash").strip()

    if not api_key:
        import random
        tpl = random.choice(CAPTION_TEMPLATES)
        caption = tpl.format(
            title=payload.title,
            category=payload.category,
            ingredients=ingredients_str
        )
        return {"caption": caption[:280]}

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name)
        prompt = (
            f"Buatlah caption postingan media sosial masakan dalam Bahasa Indonesia yang kreatif, santai, dan menarik. "
            f"Info makanan - Judul: {payload.title}, Kategori: {payload.category}, Bahan utama: {ingredients_str}. "
            f"Ketentuan: Panjang caption wajib di bawah 280 karakter, sertakan emoji makanan yang relevan, dan gaya bahasa ala food blogger lokal Indonesia yang ramah."
        )
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith('"') and text.endswith('"'):
            text = text[1:-1].strip()
        return {"caption": text[:280]}
    except Exception as e:
        import random
        tpl = random.choice(CAPTION_TEMPLATES)
        caption = tpl.format(
            title=payload.title,
            category=payload.category,
            ingredients=ingredients_str
        )
        return {"caption": caption[:280]}


class DrugInfoRequest(BaseModel):
    name: str
    apiKey: Optional[str] = None
    aiModel: Optional[str] = None


class DrugInfoResponse(BaseModel):
    komposisi: str
    kegunaan: str
    cara_pakai: str
    indikasi: str


MOCK_DRUG_DATABASE = {
    "paracetamol": {
        "komposisi": "Paracetamol 500 mg per tablet.",
        "kegunaan": "Meredakan demam, sakit kepala, sakit gigi, dan nyeri ringan hingga sedang.",
        "cara_pakai": "Dewasa: 1-2 tablet, 3-4 kali sehari setelah makan. Anak-anak: Sesuai petunjuk dokter.",
        "indikasi": "Nyeri ringan sampai sedang, demam."
    },
    "ibuprofen": {
        "komposisi": "Ibuprofen 200 mg atau 400 mg per tablet.",
        "kegunaan": "Meredakan nyeri, bengkak, peradangan, serta demam (terutama nyeri sendi, sakit gigi, nyeri haid).",
        "cara_pakai": "Dewasa: 200-400 mg, 3-4 kali sehari setelah makan. Tidak boleh diminum saat perut kosong.",
        "indikasi": "Nyeri inflamasi, sakit kepala, sakit gigi, demam."
    },
    "amoxicillin": {
        "komposisi": "Amoxicillin Trihydrate 500 mg per tablet.",
        "kegunaan": "Antibiotik untuk mengobati berbagai jenis infeksi bakteri (infeksi saluran pernapasan, kulit, THT, saluran kemih).",
        "cara_pakai": "Dewasa: 250-500 mg setiap 8 jam. Wajib dihabiskan sesuai resep dokter meskipun gejala sudah mereda.",
        "indikasi": "Infeksi bakteri sensitif."
    }
}


@api_router.post("/drugs/info", response_model=DrugInfoResponse)
async def get_drug_info(payload: DrugInfoRequest):
    name_clean = payload.name.strip().lower()
    if not name_clean:
        raise HTTPException(status_code=400, detail="Nama obat tidak boleh kosong.")

    api_key = (payload.apiKey or os.environ.get("GEMINI_API_KEY", "")).strip()
    model_name = (payload.aiModel or "gemini-2.5-flash").strip()

    # Cek di database tiruan lokal dulu sebagai fallback
    if name_clean in MOCK_DRUG_DATABASE:
        data = MOCK_DRUG_DATABASE[name_clean]
        return DrugInfoResponse(
            komposisi=data["komposisi"],
            kegunaan=data["kegunaan"],
            cara_pakai=data["cara_pakai"],
            indikasi=data["indikasi"]
        )

    if not api_key:
        name_original = payload.name.strip()
        return DrugInfoResponse(
            komposisi=f"{name_original} zat aktif tunggal.",
            kegunaan=f"Digunakan sebagai terapi penunjang atau pengobatan gejala terkait {name_original}.",
            cara_pakai="Diminum sesuai petunjuk dokter atau petunjuk pada kemasan produk obat.",
            indikasi=f"Silakan konfigurasikan GEMINI_API_KEY di Pengaturan untuk mendapatkan detail informasi medis {name_original} secara akurat dari internet."
        )

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name)
        
        prompt = (
            f"Berikan informasi medis resmi dalam Bahasa Indonesia untuk obat dengan nama: '{payload.name}'. "
            f"Format jawaban wajib dalam bentuk JSON mentah dengan key berikut:\n"
            f"- 'komposisi': zat aktif dan kandungan obatnya.\n"
            f"- 'kegunaan': manfaat dan kegunaan spesifik obat.\n"
            f"- 'cara_pakai': aturan pakai dan cara minum obat yang lazim.\n"
            f"- 'indikasi': indikasi medis atau kondisi kesehatan yang diobati.\n"
            f"Ketentuan: Jangan berikan teks pengantar, penutup, atau tanda markdown ```json. Cukup berikan JSON object-nya saja."
        )
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Bersihkan pembungkus markdown ```json jika model mengabaikan instruksi prompt
        if "```" in text:
            lines = text.split("\n")
            cleaned_lines = [l for l in lines if not (l.strip().startswith("```") or l.strip().endswith("```"))]
            text = "\n".join(cleaned_lines).strip()
            
        data = json.loads(text)
        return DrugInfoResponse(
            komposisi=str(data.get("komposisi", "Informasi tidak tersedia.")),
            kegunaan=str(data.get("kegunaan", "Informasi tidak tersedia.")),
            cara_pakai=str(data.get("cara_pakai", "Informasi tidak tersedia.")),
            indikasi=str(data.get("indikasi", "Informasi tidak tersedia."))
        )
    except Exception as e:
        name_original = payload.name.strip()
        return DrugInfoResponse(
            komposisi=f"{name_original} zat aktif tunggal.",
            kegunaan=f"Terapi gejala penyakit terkait {name_original}.",
            cara_pakai="Gunakan sesuai aturan pakai pada kemasan obat.",
            indikasi=f"Gagal memproses AI: {str(e)}"
        )


@api_router.get("/mock-recipe-html", response_class=HTMLResponse)
async def get_mock_recipe_html():
    html_content = """<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>Nasi Goreng Spesial Mock</title>
<script type="application/ld+json">
{
  "@context": "https://schema.org/",
  "@type": "Recipe",
  "name": "Nasi Goreng Spesial Mock",
  "image": ["https://example.com/nasi-goreng.jpg"],
  "recipeIngredient": [
    "3 cangkir nasi putih dingin",
    "2 siung bawang putih cincang",
    "2 sdm kecap manis",
    "1 butir telur ayam"
  ],
  "recipeInstructions": [
    {"@type": "HowToStep", "text": "Panaskan sedikit minyak goreng di wajan."},
    {"@type": "HowToStep", "text": "Tumis bawang putih hingga harum."},
    {"@type": "HowToStep", "text": "Masukkan nasi dan kecap manis, aduk rata."},
    {"@type": "HowToStep", "text": "Tambahkan telur, orak-arik hingga matang."}
  ],
  "cookTime": "PT15M",
  "recipeYield": "2"
}
</script>
</head>
<body><h1>Nasi Goreng Spesial Mock</h1></body>
</html>
"""
    return HTMLResponse(content=html_content, status_code=200)


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
