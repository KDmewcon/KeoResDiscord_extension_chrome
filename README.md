<p align="center">
  <img src="icons/icon128.png" alt="Discord Decoration Grabber" width="100"/>
</p>

<h1 align="center">🎨 Discord Decoration Grabber</h1>

<p align="center">
  <strong>Chrome Extension để tải tất cả Avatar Decorations, Profile Effects & Nameplates từ Discord</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Chrome Extension"/>
  <img src="https://img.shields.io/badge/Discord-API-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord"/>
  <img src="https://img.shields.io/badge/Manifest-V3-FF6B6B?style=for-the-badge" alt="MV3"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT"/>
</p>

---

## ✨ Tính Năng

| Tính năng | Mô tả |
|-----------|-------|
| 🖼️ **Avatar Decorations** | Tải tất cả khung avatar decorations (PNG, chất lượng cao) |
| 🌟 **Profile Effects** | Tải tất cả hiệu ứng profile (PNG, GIF, WebM) |
| 🏷️ **Nameplates** | Tải tất cả bảng tên / nameplates (WebM animated + PNG static) |
| 📦 **Nén ZIP thông minh** | Tự động chia ZIP theo kích thước (~500MB/file) tránh hết RAM |
| 💾 **Save As Dialog** | Hiện hộp thoại chọn nơi lưu file |
| 🔄 **Tự động lấy Token** | Tự bắt token Discord từ browser, không cần nhập tay |
| 🎨 **Giao diện đẹp** | Dark theme phong cách Discord, responsive |
| ⚡ **Tải song song** | Fetch 4 files đồng thời, hiện progress realtime |

## 📸 Preview

### Giao diện chính
- Tab **Decorations**: Hiển thị tất cả avatar decorations theo category
- Tab **Effects**: Hiển thị profile effects với preview
- Tab **Nameplates**: Hiển thị bảng tên Discord
- Tab **Tất cả**: Gộp toàn bộ items

### Trang tải ZIP
- Progress bar realtime
- Hiển thị số file đã tải / tổng
- Tự động nén và hiện Save As dialog

## 🚀 Cài Đặt

### Cách 1: Tải trực tiếp

1. **Clone repo:**
   ```bash
   git clone https://github.com/your-username/KeoResDiscord.git
   ```

2. **Mở Chrome Extensions:**
   - Truy cập `chrome://extensions/`
   - Bật **Developer mode** (góc phải trên)

3. **Load extension:**
   - Nhấn **"Load unpacked"**
   - Chọn thư mục `KeoResDiscord`

4. **Xong!** Icon extension sẽ xuất hiện trên thanh toolbar

### Cách 2: Tải ZIP

1. Nhấn **Code** → **Download ZIP** trên GitHub
2. Giải nén file ZIP
3. Làm theo bước 2-4 ở Cách 1

## 📖 Hướng Dẫn Sử Dụng

### Bước 1: Kết nối Discord
1. Mở [Discord Web](https://discord.com/app) trong Chrome
2. Đăng nhập tài khoản Discord
3. Nhấn icon extension trên toolbar

### Bước 2: Tải dữ liệu
1. Extension sẽ tự động bắt token từ Discord
2. Nhấn nút **"Tải dữ liệu"**
3. Chờ vài giây để fetch tất cả decorations, effects, nameplates

### Bước 3: Tải xuống
- **Tải 1 item**: Nhấn nút ⬇️ trên card hoặc trong preview
- **Tải tất cả (ZIP)**: Nhấn **"Tải tất cả (ZIP)"**
  - Extension sẽ mở tab mới với progress bar
  - Tải từng file → nén ZIP → hiện hộp thoại Save As
  - ZIP được chia tự động nếu vượt 500MB

## 🏗️ Cấu Trúc Project

```
KeoResDiscord/
├── manifest.json          # Extension config (Manifest V3)
├── popup.html             # Giao diện popup chính
├── popup.css              # Styles (Dark theme)
├── popup.js               # Logic chính: fetch, render, download
├── download.html          # Trang tải ZIP (chạy trong tab riêng)
├── download.js            # Logic nén ZIP với progress
├── content.js             # Content script: bắt token Discord
├── background.js          # Service worker: xử lý downloads
├── jszip.min.js           # Thư viện nén ZIP
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## 🔧 Công Nghệ

- **Chrome Extension Manifest V3**
- **Discord API v9** — Collectibles Categories, Profile Effects, Avatar Decorations
- **JSZip** — Nén file ZIP trong browser
- **Vanilla JS** — Không framework, nhẹ và nhanh

## 📡 Discord API Endpoints

| Endpoint | Mô tả |
|----------|-------|
| `/api/v9/collectibles-categories` | Tất cả collectibles (decorations, effects, nameplates) |
| `/api/v9/user-profile-effects` | Profile effects riêng |
| `/api/v9/avatar-decorations` | Avatar decorations riêng |

## 🎯 CDN URL Formats

```
Avatar Decorations:
  https://cdn.discordapp.com/avatar-decoration-presets/{asset}.png?size=1024&passthrough=true

Profile Effects:
  https://cdn.discordapp.com/avatar-decoration-presets/{asset}.png  (hoặc .gif, .webp)

Nameplates:
  https://cdn.discordapp.com/assets/collectibles/nameplates/{category}/{name}/asset.webm
  https://cdn.discordapp.com/assets/collectibles/nameplates/{category}/{name}/static.png
```

## ⚠️ Lưu Ý

- Extension chỉ hoạt động khi **Discord Web đang mở** trong browser
- Token được lưu **local** trong extension, không gửi ra bên ngoài
- Cần **bật Developer Mode** trong Chrome Extensions
- Nếu token hết hạn, **refresh trang Discord** rồi thử lại
- Với số lượng file lớn (2000+), ZIP được **tự động chia** thành nhiều phần (~500MB/file)

## 🤝 Đóng Góp

Mọi đóng góp đều được welcome! Hãy:

1. Fork repo
2. Tạo branch mới (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Made with ❤️ for Discord Community
</p>
