// download.js - Xử lý tải ZIP trong tab riêng
// Chia theo kích thước ~500MB mỗi ZIP
(async function () {
  const progressText = document.getElementById('progressText');
  const progressBar = document.getElementById('progressBar');
  const stats = document.getElementById('stats');
  const subtitle = document.getElementById('subtitle');
  const spinner = document.getElementById('spinner');
  const closeBtn = document.getElementById('closeBtn');

  closeBtn.addEventListener('click', function () { window.close(); });

  function updateProgress(text, percent, statsText) {
    progressText.textContent = text;
    progressBar.style.width = percent + '%';
    if (statsText) stats.textContent = statsText;
  }

  function showDone(text) {
    spinner.style.display = 'none';
    progressText.className = 'progress-text done';
    progressText.textContent = text;
    progressBar.style.width = '100%';
    closeBtn.style.display = 'inline-block';
  }

  function showError(text) {
    spinner.style.display = 'none';
    progressText.className = 'progress-text error-text';
    progressText.textContent = text;
    closeBtn.style.display = 'inline-block';
  }

  function formatSize(bytes) {
    if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
  }

  try {
    var data = await chrome.storage.local.get('zipJob');
    if (!data.zipJob || !data.zipJob.fileList) {
      showError('Không có dữ liệu. Quay lại popup, nhấn "Tải dữ liệu" rồi "Tải tất cả".');
      return;
    }

    var fileList = data.zipJob.fileList;
    var zipFilename = data.zipJob.zipFilename;
    chrome.storage.local.remove('zipJob');

    var totalFiles = fileList.length;
    var MAX_ZIP_SIZE = 500 * 1024 * 1024; // 500MB

    subtitle.textContent = 'Đang tải ' + totalFiles + ' files...';

    var totalCompleted = 0;
    var totalFailed = 0;
    var totalZips = 0;
    var totalBytes = 0;

    var zip = new JSZip();
    var currentZipSize = 0;
    var currentZipPart = 1;
    var filesInCurrentZip = 0;

    // Hàm tải xuống 1 ZIP
    async function flushZip() {
      if (filesInCurrentZip === 0) return;

      var partName = currentZipPart === 1 && currentZipSize < MAX_ZIP_SIZE
        ? zipFilename
        : zipFilename.replace('.zip', '_part' + currentZipPart + '.zip');

      updateProgress('Đang nén ZIP part ' + currentZipPart + '... (' + filesInCurrentZip + ' files)', 85);

      var zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 5 }
      });

      // Tải xuống tự động
      var blobUrl = URL.createObjectURL(zipBlob);
      var a = document.createElement('a');
      a.href = blobUrl;
      a.download = partName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();

      var sizeMB = formatSize(zipBlob.size);
      totalZips++;
      currentZipPart++;

      // Giải phóng RAM
      setTimeout(function () { URL.revokeObjectURL(blobUrl); }, 30000);
      zip = new JSZip();
      currentZipSize = 0;
      filesInCurrentZip = 0;

      updateProgress('Đã tải ZIP (' + sizeMB + '). Tiếp tục...', 85,
        totalCompleted + ' files | ' + totalZips + ' ZIP đã tải');

      // Chờ 1.5s để browser giải phóng RAM
      await new Promise(function (r) { setTimeout(r, 1500); });
    }

    // Fetch từng file
    var batchSize = 4;
    for (var i = 0; i < fileList.length; i += batchSize) {
      var batch = fileList.slice(i, i + batchSize);
      var promises = batch.map(async function (fileItem) {
        try {
          var response = await fetch(fileItem.url);
          if (!response.ok) throw new Error('HTTP ' + response.status);
          var arrayBuffer = await response.arrayBuffer();

          zip.file(fileItem.filename, arrayBuffer);
          currentZipSize += arrayBuffer.byteLength;
          totalBytes += arrayBuffer.byteLength;
          filesInCurrentZip++;
          totalCompleted++;
        } catch (err) {
          console.warn('Failed: ' + fileItem.name + ': ' + err.message);
          totalFailed++;
        }

        var pct = Math.round(((totalCompleted + totalFailed) / totalFiles) * 80);
        updateProgress(
          'Đang tải... (' + (totalCompleted + totalFailed) + '/' + totalFiles + ')',
          pct,
          totalCompleted + ' ok | ' + formatSize(totalBytes) + (totalFailed > 0 ? ' | ' + totalFailed + ' lỗi' : '')
        );
      });
      await Promise.all(promises);

      // Nếu ZIP hiện tại đạt ~500MB thì flush
      if (currentZipSize >= MAX_ZIP_SIZE) {
        await flushZip();
      }
    }

    // Flush ZIP cuối cùng
    if (filesInCurrentZip > 0) {
      await flushZip();
    }

    // Hoàn tất
    var result = totalCompleted + ' files (' + formatSize(totalBytes) + ') → ' + totalZips + ' ZIP';
    if (totalFailed > 0) result += ' | ' + totalFailed + ' lỗi';
    showDone('Đã tải xong! ' + result);
    subtitle.textContent = 'Các file ZIP đã lưu vào thư mục Downloads';

  } catch (err) {
    showError('Lỗi: ' + err.message);
    console.error('ZIP download error:', err);
  }
})();
