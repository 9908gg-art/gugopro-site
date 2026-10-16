(function () {
  'use strict';
  var root = document.body;
  var tool = root.getAttribute('data-video-tool') || '';
  var en = root.getAttribute('data-language') === 'en';
  var C = window.ConverterCommon;
  var T = en ? {
    choose: 'Choose a video file first.', loading: 'Loading local video…', ready: 'Video is ready for local processing.', bad: 'This video could not be decoded in the browser.',
    done: 'Processing complete. Download is ready.', failed: 'Local video processing failed. Try a shorter browser-supported video.',
    capture: 'Frame captured locally.', batch: 'Frame ZIP is ready.', gif: 'GIF is ready.', audio: 'Audio extraction is ready.', clear: 'Local video state cleared.', noAudio: 'No readable audio track was found.',
    unsupported: 'This browser does not support the required local media API.', rendering: 'Rendering locally…', crop: 'Crop area updated locally.'
  } : {
    choose: '請先選擇影片檔案。', loading: '正在載入本機影片…', ready: '影片已準備好，可以在本機處理。', bad: '瀏覽器無法解碼這部影片。',
    done: '處理完成，可以下載。', failed: '本機影片處理失敗，請改用較短且瀏覽器支援的影片。',
    capture: '已在本機擷取影格。', batch: '影格 ZIP 已準備好。', gif: 'GIF 已準備好。', audio: '音訊已在本機提取完成。', clear: '已清除本機影片狀態。', noAudio: '找不到可讀取的音訊軌。',
    unsupported: '此瀏覽器不支援必要的本機媒體 API。', rendering: '正在本機渲染…', crop: '裁切框已在本機更新。'
  };
  var fileInput = document.getElementById('video-file');
  var fileInfo = document.getElementById('video-file-info');
  var dropzone = document.getElementById('video-dropzone');
  var video = document.getElementById('video-preview');
  var canvas = document.getElementById('video-canvas');
  var outputVideo = document.getElementById('video-output');
  var outputAudio = document.getElementById('video-audio-output');
  var outputImage = document.getElementById('video-output-image');
  var outputPreview = document.getElementById('video-output-preview');
  var gallery = document.getElementById('video-frame-gallery');
  var status = document.getElementById('video-status');
  var bar = document.getElementById('video-progress-bar');
  var progressLabel = document.getElementById('video-progress-label');
  var download = document.getElementById('video-download');
  var file = null, sourceUrl = null, outputBlob = null, outputName = '', audioSource = null, audioContext = null;
  var frameUrls = [], crop = {x: 0, y: 0, w: 1, h: 1};
  var cropStage = document.getElementById('video-crop-stage'), cropBox = document.getElementById('video-crop-box');

  function progress(value) { C.setProgress(bar, progressLabel, value); }
  function setStatus(text, kind) { C.setStatus(status, text, kind); }
  function fmtTime(seconds) { if (!isFinite(seconds)) return '0.00 s'; return Number(seconds).toFixed(2) + ' s'; }
  function baseName() { return (file && file.name ? file.name.replace(/\.[^.]+$/, '') : 'video') || 'video'; }
  function setOutput(blob, name, kind) {
    if (outputVideo) { outputVideo.hidden = true; outputVideo.removeAttribute('src'); outputVideo.load(); }
    if (outputAudio) { outputAudio.hidden = true; outputAudio.removeAttribute('src'); outputAudio.load(); }
    if (outputImage) { outputImage.hidden = true; outputImage.removeAttribute('src'); }
    outputBlob = blob; outputName = name;
    if (kind === 'audio' && outputAudio) { outputAudio.src = URL.createObjectURL(blob); outputAudio.hidden = false; outputAudio.load(); }
    else if (kind === 'video' && outputVideo) { outputVideo.src = URL.createObjectURL(blob); outputVideo.hidden = false; outputVideo.load(); }
    else if (kind === 'image' && outputImage) { outputImage.src = URL.createObjectURL(blob); outputImage.hidden = false; }
    if (download) { download.disabled = !blob; download.dataset.filename = name; }
    if (outputPreview) outputPreview.textContent = name + ' · ' + C.formatBytes(blob.size) + ' · ' + (kind || 'local Blob');
  }
  function clearCanvas() { if (!canvas) return; var ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); }
  function fitSize(width, height, maxWidth) { var scale = Math.min(1, (maxWidth || 1280) / width); return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }; }
  function setupCanvas(rotation) {
    var angle = Number(rotation || 0), swap = angle === 90 || angle === 270, size = fitSize(video.videoWidth || 640, video.videoHeight || 360, 1280);
    canvas.width = swap ? size.height : size.width; canvas.height = swap ? size.width : size.height;
    return size;
  }
  function setupCropCanvas(rect) {
    var size = fitSize(video.videoWidth * rect.w, video.videoHeight * rect.h, 1280);
    canvas.width = size.width; canvas.height = size.height;
  }
  function drawTransformed(rotation, flipH, flipV) {
    if (!video.videoWidth || video.readyState < 2) return;
    var angle = Number(rotation || 0), swap = angle === 90 || angle === 270, size = fitSize(video.videoWidth, video.videoHeight, 1280);
    if (canvas.width !== (swap ? size.height : size.width) || canvas.height !== (swap ? size.width : size.height)) setupCanvas(angle);
    var ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    ctx.save(); ctx.clearRect(0, 0, w, h); ctx.translate(w / 2, h / 2); ctx.rotate(angle * Math.PI / 180); ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(video, -size.width / 2, -size.height / 2, size.width, size.height); ctx.restore();
  }
  function drawCropped(rect) {
    if (!video.videoWidth || video.readyState < 2) return;
    if (!canvas.width || !canvas.height) setupCropCanvas(rect);
    var ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, rect.x * video.videoWidth, rect.y * video.videoHeight, rect.w * video.videoWidth, rect.h * video.videoHeight, 0, 0, canvas.width, canvas.height);
  }
  function drawFrame() { setupCanvas(0); drawTransformed(0, false, false); }
  function seek(time) { return new Promise(function (resolve) { var target = Math.max(0, Math.min(video.duration || 0, Number(time) || 0)); if (Math.abs(video.currentTime - target) < 0.015) { drawFrame(); resolve(); return; } function done() { video.removeEventListener('seeked', done); drawFrame(); resolve(); } video.addEventListener('seeked', done); video.currentTime = target; }); }
  function canvasBlob(type) { return new Promise(function (resolve, reject) { canvas.toBlob(function (blob) { if (blob) resolve(blob); else reject(new Error('Canvas export failed')); }, type || 'image/png', .92); }); }
  function dataUrlBlob(dataUrl) { var parts = dataUrl.split(','), mime = (parts[0].match(/:(.*?);/) || [,'application/octet-stream'])[1], raw = atob(parts[1]), bytes = new Uint8Array(raw.length); for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i); return new Blob([bytes], {type: mime}); }
  function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  function safeMime() { var choices = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']; for (var i = 0; i < choices.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported(choices[i])) return choices[i]; return ''; }
  function localVideoStream(includeAudio) {
    if (!canvas.captureStream || !window.MediaRecorder) throw new Error(T.unsupported);
    var stream = canvas.captureStream(30);
    if (includeAudio && video.captureStream) video.captureStream().getAudioTracks().forEach(function (track) { stream.addTrack(track); });
    return stream;
  }
  function currentCrop() { return {x: crop.x, y: crop.y, w: crop.w, h: crop.h}; }
  function ratioValue() { var node = document.getElementById('video-crop-ratio'); return node ? node.value : 'free'; }
  function syncCropBox() {
    if (!cropBox || !cropStage) return;
    cropBox.style.left = (crop.x * 100) + '%'; cropBox.style.top = (crop.y * 100) + '%'; cropBox.style.width = (crop.w * 100) + '%'; cropBox.style.height = (crop.h * 100) + '%';
    var scale = document.getElementById('video-crop-scale'); var label = document.getElementById('video-crop-scale-label'); if (scale) scale.value = Math.round(Math.max(crop.w, crop.h) * 100); if (label) label.textContent = Math.round(Math.max(crop.w, crop.h) * 100) + '%';
  }
  function resetCrop() {
    if (!video.videoWidth || !video.videoHeight) return;
    var requested = ratioValue(), ratio = requested === 'free' ? video.videoWidth / video.videoHeight : Number(requested), videoRatio = video.videoWidth / video.videoHeight;
    var scaleNode = document.getElementById('video-crop-scale'), factor = Math.max(.2, Math.min(1, Number(scaleNode && scaleNode.value || 78) / 100));
    var w = Math.min(.86, factor), h = w * videoRatio / ratio;
    if (h > .86) { h = .86 * factor; w = h * ratio / videoRatio; }
    crop.w = Math.max(.08, Math.min(.96, w)); crop.h = Math.max(.08, Math.min(.96, h)); crop.x = Math.max(0, (1 - crop.w) / 2); crop.y = Math.max(0, (1 - crop.h) / 2); syncCropBox(); drawCropped(currentCrop());
  }
  function bindCrop() {
    if (!cropBox || !cropStage) return;
    var ratio = document.getElementById('video-crop-ratio'), scale = document.getElementById('video-crop-scale');
    if (ratio) ratio.addEventListener('change', resetCrop); if (scale) scale.addEventListener('input', resetCrop);
    var dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
    cropBox.addEventListener('pointerdown', function (event) { dragging = true; sx = event.clientX; sy = event.clientY; ox = crop.x; oy = crop.y; cropBox.setPointerCapture(event.pointerId); event.preventDefault(); });
    cropBox.addEventListener('pointermove', function (event) { if (!dragging) return; var box = cropStage.getBoundingClientRect(); crop.x = Math.max(0, Math.min(1 - crop.w, ox + (event.clientX - sx) / box.width)); crop.y = Math.max(0, Math.min(1 - crop.h, oy + (event.clientY - sy) / box.height)); syncCropBox(); drawCropped(currentCrop()); });
    cropBox.addEventListener('pointerup', function () { dragging = false; setStatus(T.crop, 'success'); });
  }
  async function renderVideo(options) {
    if (!file || !video.duration) { setStatus(T.choose, 'error'); return; }
    var mime = safeMime(); if (!mime) { setStatus(T.unsupported, 'error'); return; }
    var rotation = Number(options.rotation || 0), flipH = !!options.flipH, flipV = !!options.flipV, includeAudio = options.includeAudio !== false, cropRect = options.crop || null;
    if (cropRect) setupCropCanvas(cropRect); else setupCanvas(rotation);
    video.pause(); video.currentTime = 0; video.playbackRate = Number(options.speed || 1); progress(3); setStatus(T.rendering);
    var stream = localVideoStream(includeAudio), recorder = new MediaRecorder(stream, {mimeType: mime}), chunks = [], raf = 0, ended = false;
    recorder.ondataavailable = function (event) { if (event.data && event.data.size) chunks.push(event.data); };
    var finish = new Promise(function (resolve, reject) { recorder.onerror = function () { reject(new Error('MediaRecorder error')); }; recorder.onstop = function () { resolve(new Blob(chunks, {type: mime.split(';')[0]})); }; });
    function loop() { if (cropRect) drawCropped(cropRect); else drawTransformed(rotation, flipH, flipV); progress(Math.min(96, Math.round((video.currentTime / video.duration) * 92) + 4)); if (!ended) raf = requestAnimationFrame(loop); }
    function stop() { if (ended) return; ended = true; cancelAnimationFrame(raf); if (cropRect) drawCropped(cropRect); else drawTransformed(rotation, flipH, flipV); if (recorder.state !== 'inactive') recorder.stop(); }
    video.onended = stop; recorder.start(120); loop(); try { await video.play(); } catch (error) { stop(); throw error; }
    var blob = await finish; stream.getTracks().forEach(function (track) { track.stop(); }); video.onended = null; video.playbackRate = 1; progress(100); setOutput(blob, baseName() + (options.suffix || '-edited') + '.webm', 'video'); setStatus(T.done, 'success');
  }
  function mergeFloat(chunks, total) { var data = new Float32Array(total), offset = 0; chunks.forEach(function (part) { data.set(part, offset); offset += part.length; }); return data; }
  function encodeWav(channels, sampleRate) { var total = channels[0].reduce(function (sum, part) { return sum + part.length; }, 0), count = channels.length, view = new DataView(new ArrayBuffer(44 + total * count * 2)); function write(offset, text) { for (var i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)); } write(0, 'RIFF'); view.setUint32(4, 36 + total * count * 2, true); write(8, 'WAVE'); write(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, count, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * count * 2, true); view.setUint16(32, count * 2, true); view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, total * count * 2, true); var merged = channels.map(function (parts) { return mergeFloat(parts, total); }), pos = 44; for (var i = 0; i < total; i++) for (var ch = 0; ch < count; ch++) { var value = Math.max(-1, Math.min(1, merged[ch][i] || 0)); view.setInt16(pos, value < 0 ? value * 32768 : value * 32767, true); pos += 2; } return new Blob([view], {type: 'audio/wav'}); }
  function encodeMp3(channels, sampleRate, bitrate) { if (!window.lamejs || !window.lamejs.Mp3Encoder) throw new Error('MP3 encoder is not loaded'); var count = Math.min(2, channels.length), total = channels[0].reduce(function (sum, part) { return sum + part.length; }, 0), left = mergeFloat(channels[0], total), right = count > 1 ? mergeFloat(channels[1], total) : null, encoder = new window.lamejs.Mp3Encoder(count, sampleRate, bitrate || 128), chunks = [], block = 1152; function int16(array, from, to) { var result = new Int16Array(to - from); for (var i = from; i < to; i++) result[i - from] = Math.max(-32768, Math.min(32767, array[i] < 0 ? array[i] * 32768 : array[i] * 32767)); return result; } for (var i = 0; i < total; i += block) { var end = Math.min(total, i + block), encoded = count > 1 ? encoder.encodeBuffer(int16(left, i, end), int16(right, i, end)) : encoder.encodeBuffer(int16(left, i, end)); if (encoded.length) chunks.push(new Int8Array(encoded)); } var flushed = encoder.flush(); if (flushed.length) chunks.push(new Int8Array(flushed)); return new Blob(chunks, {type: 'audio/mpeg'}); }
  async function extractAudio() {
    if (!file || !video.duration) { setStatus(T.choose, 'error'); return; }
    var AudioCtor = window.AudioContext || window.webkitAudioContext; if (!AudioCtor || !window.MediaElementAudioSourceNode) { setStatus(T.unsupported, 'error'); return; }
    if (!audioContext) audioContext = new AudioCtor(); await audioContext.resume(); if (!audioSource) audioSource = audioContext.createMediaElementSource(video);
    var processor = audioContext.createScriptProcessor(4096, 2, 2), gain = audioContext.createGain(), left = [], right = [], channels = 2, sampleRate = audioContext.sampleRate, hasSamples = false;
    gain.gain.value = 0; audioSource.connect(processor); processor.connect(gain); gain.connect(audioContext.destination); video.currentTime = 0; video.volume = 1; progress(4); setStatus(T.rendering);
    processor.onaudioprocess = function (event) { var input = event.inputBuffer, count = Math.min(2, input.numberOfChannels || 1); channels = count; left.push(new Float32Array(input.getChannelData(0))); if (count > 1) right.push(new Float32Array(input.getChannelData(1))); else right.push(new Float32Array(input.getChannelData(0))); hasSamples = true; progress(Math.min(96, Math.round(video.currentTime / video.duration * 92) + 4)); };
    var ended = new Promise(function (resolve) { video.onended = resolve; });
    try { await video.play(); await ended; await wait(120); } finally { processor.onaudioprocess = null; processor.disconnect(); gain.disconnect(); video.onended = null; video.pause(); }
    if (!hasSamples) throw new Error(T.noAudio); var format = (document.getElementById('video-audio-format') || {}).value || 'wav', bitrate = Number((document.getElementById('video-audio-bitrate') || {}).value) || 128, blob = format === 'mp3' ? encodeMp3([left, right].slice(0, channels), sampleRate, bitrate) : encodeWav([left, right].slice(0, channels), sampleRate); progress(100); setOutput(blob, baseName() + '-audio.' + format, 'audio'); setStatus(T.audio, 'success');
  }
  async function captureCurrent() { if (!file || !video.duration) { setStatus(T.choose, 'error'); return; } drawFrame(); var type = ((document.getElementById('video-frame-format') || {}).value || 'png') === 'jpg' ? 'image/jpeg' : 'image/png', blob = await canvasBlob(type); setOutput(blob, baseName() + '-frame.' + (type === 'image/jpeg' ? 'jpg' : 'png'), 'image'); if (gallery) { var url = URL.createObjectURL(blob); frameUrls.push(url); var img = document.createElement('img'); img.src = url; img.alt = en ? 'Captured frame' : '擷取的影片影格'; gallery.prepend(img); } progress(100); setStatus(T.capture, 'success'); }
  async function captureBatch() { if (!file || !video.duration) { setStatus(T.choose, 'error'); return; } if (!window.JSZip) throw new Error('JSZip is not loaded'); var interval = Math.max(.1, Number((document.getElementById('video-frame-interval') || {}).value) || 1), typeValue = (document.getElementById('video-frame-format') || {}).value || 'png', type = typeValue === 'jpg' ? 'image/jpeg' : 'image/png', zip = new window.JSZip(), original = video.currentTime, count = Math.max(1, Math.floor(video.duration / interval) + 1); progress(2); for (var index = 0, time = 0; time <= video.duration + .001; index++, time += interval) { await seek(time); var blob = await canvasBlob(type); zip.file('frame-' + String(index + 1).padStart(3, '0') + '.' + (type === 'image/jpeg' ? 'jpg' : 'png'), blob); progress(Math.round((index + 1) / count * 92) + 4); } await seek(original); var result = await zip.generateAsync({type: 'blob'}); setOutput(result, baseName() + '-frames.zip', 'zip'); progress(100); setStatus(T.batch, 'success'); }
  async function makeGif() { if (!file || !video.duration) { setStatus(T.choose, 'error'); return; } if (!window.gifshot || !window.gifshot.createGIF) throw new Error('gifshot is not loaded'); var start = Math.max(0, Number((document.getElementById('video-gif-start') || {}).value) || 0), end = Math.min(video.duration, Number((document.getElementById('video-gif-end') || {}).value) || Math.min(video.duration, start + 2)), fps = Math.max(10, Math.min(30, Number((document.getElementById('video-gif-fps') || {}).value) || 15)), width = Math.max(80, Math.min(720, Number((document.getElementById('video-gif-width') || {}).value) || 320)), frameCount = Math.max(1, Math.ceil((end - start) * fps)), images = [], original = video.currentTime; if (end <= start) throw new Error(en ? 'End time must be greater than start time.' : '結束時間必須大於開始時間。'); progress(2); for (var i = 0; i < frameCount; i++) { await seek(start + (end - start) * i / Math.max(1, frameCount - 1)); var ratio = video.videoHeight / video.videoWidth, size = fitSize(width, Math.max(1, Math.round(width * ratio)), width); canvas.width = size.width; canvas.height = size.height; canvas.getContext('2d').drawImage(video, 0, 0, size.width, size.height); images.push(canvas.toDataURL('image/png')); progress(Math.round((i + 1) / frameCount * 82) + 4); } await seek(original); var result = await new Promise(function (resolve, reject) { window.gifshot.createGIF({images: images, gifWidth: width, gifHeight: Math.max(1, Math.round(width * video.videoHeight / video.videoWidth)), interval: 1 / fps, numFrames: frameCount, sampleInterval: 1}, function (response) { if (response.error) reject(new Error(response.errorMsg || 'GIF encoding failed')); else resolve(response.image); }); }); var blob = dataUrlBlob(result); setOutput(blob, baseName() + '-clip.gif', 'image'); progress(100); setStatus(T.gif, 'success'); }
  function setActionState(enabled) { ['video-capture-current','video-capture-batch','video-gif-generate','video-audio-extract','video-render'].forEach(function (id) { var node = document.getElementById(id); if (node) node.disabled = !enabled; }); }
  function load(files) { var candidate = files && files[0]; if (!candidate || !((candidate.type || '').indexOf('video/') === 0 || /\.(mp4|webm|mov|m4v|ogv|avi|mkv)$/i.test(candidate.name))) { setStatus(T.choose, 'error'); return; } file = candidate; if (sourceUrl) URL.revokeObjectURL(sourceUrl); sourceUrl = URL.createObjectURL(file); video.src = sourceUrl; video.load(); fileInfo.innerHTML = ''; progress(10); setStatus(T.loading); video.onloadedmetadata = function () { setActionState(true); C.renderFileInfo(fileInfo, file, [[en ? 'Duration' : '長度', fmtTime(video.duration)], [en ? 'Resolution' : '解析度', video.videoWidth + ' × ' + video.videoHeight], [en ? 'Type' : '格式', file.type || 'browser video']]); if (document.getElementById('video-gif-end')) document.getElementById('video-gif-end').value = Math.min(2, video.duration).toFixed(2); if (tool === 'video-crop') { bindCrop(); resetCrop(); } else drawFrame(); progress(100); setStatus(T.ready, 'success'); }; video.onerror = function () { progress(0); setStatus(T.bad, 'error'); }; }
  function clear() { setActionState(false); if (sourceUrl) URL.revokeObjectURL(sourceUrl); sourceUrl = null; file = null; outputBlob = null; outputName = ''; frameUrls.forEach(URL.revokeObjectURL); frameUrls = []; if (fileInput) fileInput.value = ''; video.removeAttribute('src'); video.load(); if (outputVideo) { outputVideo.hidden = true; outputVideo.removeAttribute('src'); outputVideo.load(); } if (outputAudio) { outputAudio.hidden = true; outputAudio.removeAttribute('src'); outputAudio.load(); } if (outputImage) { outputImage.hidden = true; outputImage.removeAttribute('src'); } if (fileInfo) fileInfo.innerHTML = ''; if (gallery) gallery.innerHTML = ''; if (download) download.disabled = true; clearCanvas(); progress(0); setStatus(T.clear); }
  function onError(error) { progress(0); setStatus(error && error.message ? error.message : T.failed, 'error'); }
  if (fileInput) C.bindDropzone(dropzone, fileInput, load);
  if (download) download.addEventListener('click', function () { if (outputBlob) C.downloadBlob(outputBlob, outputName || 'video-output.webm'); });
  var clearButton = document.getElementById('video-clear'); if (clearButton) clearButton.addEventListener('click', clear);
  var captureButton = document.getElementById('video-capture-current'); if (captureButton) captureButton.addEventListener('click', function () { captureCurrent().catch(onError); });
  var batchButton = document.getElementById('video-capture-batch'); if (batchButton) batchButton.addEventListener('click', function () { captureBatch().catch(onError); });
  var gifButton = document.getElementById('video-gif-generate'); if (gifButton) gifButton.addEventListener('click', function () { makeGif().catch(onError); });
  var audioButton = document.getElementById('video-audio-extract'); if (audioButton) audioButton.addEventListener('click', function () { extractAudio().catch(onError); });
  var renderButton = document.getElementById('video-render'); if (renderButton) renderButton.addEventListener('click', function () { var rotation = (document.getElementById('video-rotation') || {}).value || 0, speed = (document.getElementById('video-speed') || {}).value || 1, cropRect = tool === 'video-crop' ? currentCrop() : null; renderVideo({rotation: rotation, speed: speed, crop: cropRect, flipH: document.getElementById('video-flip-h') ? document.getElementById('video-flip-h').checked : false, flipV: document.getElementById('video-flip-v') ? document.getElementById('video-flip-v').checked : false, includeAudio: tool !== 'video-mute', suffix: tool === 'video-mute' ? '-muted' : tool === 'video-speed' ? '-speed' : tool === 'video-crop' ? '-cropped' : '-rotated'}).catch(onError); });
  C.initCommerce('converter-commerce');
}());
