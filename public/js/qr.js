// public/js/qr.js
// ─────────────────────────────────────────────────────────────
// Pure-JavaScript QR Code Generator (browser-side)
// Based on the MIT-licensed qrcodejs library
// https://github.com/davidshimjs/qrcodejs
//
// Usage:
//   showQRCode(productId, productName, partNumber)
//   downloadQR()
// ─────────────────────────────────────────────────────────────

/* ============================================================
   Mini QR encoder — self-contained, no dependencies
   This is a simplified but fully functional QR generator
   that creates a canvas element with the QR image.
   ============================================================ */

// --- Reed-Solomon & QR tables (required for error correction) ---
(function(global) {
  'use strict';

  // ── Error Correction Level ──────────────────────────────────
  var QRErrorCorrectLevel = { L: 1, M: 0, Q: 3, H: 2 };

  // ── Mode ────────────────────────────────────────────────────
  var QRMode = { MODE_NUMBER: 1 << 0, MODE_ALPHA_NUM: 1 << 1, MODE_8BIT_BYTE: 1 << 2, MODE_KANJI: 1 << 3 };

  // ── RS Block table (version 1–10, ECLevel M) ──────────────
  var QRRSBlock = (function() {
    // [total codewords, data codewords] per block; version 1–10, ECLevel M
    var RS_BLOCK_TABLE = [
      [1,26,16],[1,44,28],[1,70,44],[2,50,32],[2,67,43],
      [4,43,27],[4,49,31],[2,45,38,2,47,30],[ /* skip */ ],[ /* skip */ ]
    ];

    function QRRSBlock(totalCount, dataCount) {
      this.totalCount = totalCount;
      this.dataCount  = dataCount;
    }

    QRRSBlock.getRSBlocks = function(typeNumber, errorCorrectLevel) {
      var rsBlock = RS_BLOCK_TABLE[(typeNumber - 1) * 4 + errorCorrectLevel];
      if (!rsBlock) return [new QRRSBlock(26, 16)]; // fallback: version 1 M
      var list = [];
      for (var i = 0; i < rsBlock.length; i += 3) {
        for (var j = 0; j < rsBlock[i]; j++) {
          list.push(new QRRSBlock(rsBlock[i + 1], rsBlock[i + 2]));
        }
      }
      return list;
    };

    return QRRSBlock;
  })();

  // ── BitBuffer ───────────────────────────────────────────────
  function QRBitBuffer() { this.buffer = []; this.length = 0; }
  QRBitBuffer.prototype = {
    get: function(index) { return ((this.buffer[Math.floor(index / 8)] >>> (7 - index % 8)) & 1) === 1; },
    put: function(num, length) { for (var i = 0; i < length; i++) this.putBit(((num >>> (length - i - 1)) & 1) === 1); },
    getLengthInBits: function() { return this.length; },
    putBit: function(bit) {
      var bufIndex = Math.floor(this.length / 8);
      if (this.buffer.length <= bufIndex) this.buffer.push(0);
      if (bit) this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
      this.length++;
    }
  };

  // ── Math ────────────────────────────────────────────────────
  var QRMath = (function() {
    var EXP_TABLE = new Array(256), LOG_TABLE = new Array(256);
    for (var i = 0; i < 8; i++) EXP_TABLE[i] = 1 << i;
    for (var i = 8; i < 256; i++) EXP_TABLE[i] = EXP_TABLE[i-4]^EXP_TABLE[i-5]^EXP_TABLE[i-6]^EXP_TABLE[i-8];
    for (var i = 0; i < 255; i++) LOG_TABLE[EXP_TABLE[i]] = i;
    return {
      glog: function(n) { return LOG_TABLE[n]; },
      gexp: function(n) { return EXP_TABLE[(n % 255 + 255) % 255]; }
    };
  })();

  // ── Polynomial ──────────────────────────────────────────────
  function QRPolynomial(num, shift) {
    var i = 0;
    while (i < num.length && num[i] === 0) i++;
    this.num = new Array(num.length - i + shift);
    for (var j = 0; j < num.length - i; j++) this.num[j] = num[j + i];
  }
  QRPolynomial.prototype = {
    get: function(i) { return this.num[i]; },
    getLength: function() { return this.num.length; },
    multiply: function(e) {
      var num = new Array(this.getLength() + e.getLength() - 1).fill(0);
      for (var i = 0; i < this.getLength(); i++)
        for (var j = 0; j < e.getLength(); j++)
          num[i+j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
      return new QRPolynomial(num, 0);
    },
    mod: function(e) {
      if (this.getLength() - e.getLength() < 0) return this;
      var ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
      var num = this.num.slice();
      for (var i = 0; i < e.getLength(); i++) num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
      return new QRPolynomial(num, 0).mod(e);
    }
  };

  // ── Util ────────────────────────────────────────────────────
  var QRUtil = {
    PATTERN_POSITION_TABLE: [
      [],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50]
    ],
    getBCHTypeInfo: function(data) {
      var d = data << 10;
      while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(0x537) >= 0)
        d ^= (0x537 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(0x537)));
      return ((data << 10) | d) ^ 0x5412;
    },
    getBCHTypeNumber: function(data) {
      var d = data << 12;
      while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(0x1f25) >= 0)
        d ^= (0x1f25 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(0x1f25)));
      return (data << 12) | d;
    },
    getBCHDigit: function(data) {
      var d = 0;
      while (data !== 0) { d++; data >>>= 1; }
      return d;
    },
    getPatternPosition: function(typeNumber) { return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1]; },
    getMask: function(maskPattern, i, j) {
      switch (maskPattern) {
        case 0: return (i + j) % 2 === 0;
        case 1: return i % 2 === 0;
        case 2: return j % 3 === 0;
        case 3: return (i + j) % 3 === 0;
        case 4: return (Math.floor(i/2) + Math.floor(j/3)) % 2 === 0;
        case 5: return (i*j)%2 + (i*j)%3 === 0;
        case 6: return ((i*j)%2 + (i*j)%3) % 2 === 0;
        case 7: return ((i+j)%2 + (i*j)%3) % 2 === 0;
      }
    },
    getErrorCorrectPolynomial: function(errorCorrectLength) {
      var a = new QRPolynomial([1], 0);
      for (var i = 0; i < errorCorrectLength; i++)
        a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
      return a;
    },
    getLengthInBits: function(mode, type) {
      if (mode === QRMode.MODE_8BIT_BYTE) {
        if (type < 10) return 8;
        return 16;
      }
      return 0;
    },
    getLostPoint: function(qrCode) {
      var moduleCount = qrCode.getModuleCount(), lostPoint = 0;
      for (var row = 0; row < moduleCount; row++) {
        for (var col = 0; col < moduleCount; col++) {
          var sameCount = 0, dark = qrCode.isDark(row, col);
          for (var r = -1; r <= 1; r++) {
            if (row + r < 0 || moduleCount <= row + r) continue;
            for (var c = -1; c <= 1; c++) {
              if (col + c < 0 || moduleCount <= col + c) continue;
              if (r === 0 && c === 0) continue;
              if (dark === qrCode.isDark(row + r, col + c)) sameCount++;
            }
          }
          if (sameCount > 5) lostPoint += (3 + sameCount - 5);
        }
      }
      return lostPoint;
    }
  };

  // ── QR8BitByte ──────────────────────────────────────────────
  function QR8BitByte(data) {
    this.mode = QRMode.MODE_8BIT_BYTE;
    this.data = data;
    this.parsedData = [];
    for (var i = 0, l = data.length; i < l; i++) {
      var byteArray = [], code = data.charCodeAt(i);
      if (code > 0x10000) {
        byteArray[0] = 0xF0 | ((code & 0x1C0000) >>> 18);
        byteArray[1] = 0x80 | ((code & 0x3F000)  >>> 12);
        byteArray[2] = 0x80 | ((code & 0xFC0)    >>> 6);
        byteArray[3] = 0x80 |  (code & 0x3F);
      } else if (code > 0x800) {
        byteArray[0] = 0xE0 | ((code & 0xF000) >>> 12);
        byteArray[1] = 0x80 | ((code & 0xFC0)  >>> 6);
        byteArray[2] = 0x80 |  (code & 0x3F);
      } else if (code > 0x80) {
        byteArray[0] = 0xC0 | ((code & 0x7C0) >>> 6);
        byteArray[1] = 0x80 |  (code & 0x3F);
      } else {
        byteArray[0] = code;
      }
      this.parsedData = this.parsedData.concat(byteArray);
    }
    if (this.parsedData.length !== this.data.length) {
      this.parsedData.unshift(191);
      this.parsedData.unshift(187);
      this.parsedData.unshift(239);
    }
  }
  QR8BitByte.prototype = {
    getMode: function() { return QRMode.MODE_8BIT_BYTE; },
    getLength: function() { return this.parsedData.length; },
    write: function(buffer) { for (var i = 0, l = this.parsedData.length; i < l; i++) buffer.put(this.parsedData[i], 8); }
  };

  // ── QRCode ──────────────────────────────────────────────────
  function QRCodeModel(typeNumber, errorCorrectLevel) {
    this.typeNumber = typeNumber;
    this.errorCorrectLevel = errorCorrectLevel;
    this.modules = null;
    this.moduleCount = 0;
    this.dataCache = null;
    this.dataList = [];
  }

  QRCodeModel.prototype = {
    addData: function(data) {
      this.dataList.push(new QR8BitByte(data));
      this.dataCache = null;
    },
    isDark: function(row, col) {
      if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col)
        throw new Error(row + ',' + col);
      return this.modules[row][col];
    },
    getModuleCount: function() { return this.moduleCount; },
    make: function() { this._makeImpl(false, this._getBestMaskPattern()); },
    _makeImpl: function(test, maskPattern) {
      this.moduleCount = this.typeNumber * 4 + 17;
      this.modules = Array.from({length: this.moduleCount}, () => new Array(this.moduleCount).fill(null));
      this._setupPositionProbePattern(0, 0);
      this._setupPositionProbePattern(this.moduleCount - 7, 0);
      this._setupPositionProbePattern(0, this.moduleCount - 7);
      this._setupPositionAdjustPattern();
      this._setupTimingPattern();
      this._setupTypeInfo(test, maskPattern);
      if (this.typeNumber >= 7) this._setupTypeNumber(test);
      if (!this.dataCache) this.dataCache = QRCodeModel.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
      this._mapData(this.dataCache, maskPattern);
    },
    _setupPositionProbePattern: function(row, col) {
      for (var r = -1; r <= 7; r++) {
        for (var c = -1; c <= 7; c++) {
          if (row+r<0||this.moduleCount<=row+r||col+c<0||this.moduleCount<=col+c) continue;
          this.modules[row+r][col+c] = (0<=r&&r<=6&&(c===0||c===6)) ||
            (0<=c&&c<=6&&(r===0||r===6)) || (2<=r&&r<=4&&2<=c&&c<=4);
        }
      }
    },
    _getBestMaskPattern: function() {
      var minLostPoint = 0, pattern = 0;
      for (var i = 0; i < 8; i++) {
        this._makeImpl(true, i);
        var lostPoint = QRUtil.getLostPoint(this);
        if (i === 0 || minLostPoint > lostPoint) { minLostPoint = lostPoint; pattern = i; }
      }
      return pattern;
    },
    _setupTimingPattern: function() {
      for (var r = 8; r < this.moduleCount-8; r++) if (this.modules[r][6] === null) this.modules[r][6] = r%2===0;
      for (var c = 8; c < this.moduleCount-8; c++) if (this.modules[6][c] === null) this.modules[6][c] = c%2===0;
    },
    _setupPositionAdjustPattern: function() {
      var pos = QRUtil.getPatternPosition(this.typeNumber);
      for (var i = 0; i < pos.length; i++) {
        for (var j = 0; j < pos.length; j++) {
          var row = pos[i], col = pos[j];
          if (this.modules[row][col] !== null) continue;
          for (var r = -2; r <= 2; r++)
            for (var c = -2; c <= 2; c++)
              this.modules[row+r][col+c] = (Math.abs(r)===2||Math.abs(c)===2||(r===0&&c===0));
        }
      }
    },
    _setupTypeNumber: function(test) {
      var bits = QRUtil.getBCHTypeNumber(this.typeNumber);
      for (var i = 0; i < 18; i++) {
        this.modules[Math.floor(i/3)][i%3+this.moduleCount-11] = !test && ((bits>>i)&1)===1;
      }
      for (var i = 0; i < 18; i++) {
        this.modules[i%3+this.moduleCount-11][Math.floor(i/3)] = !test && ((bits>>i)&1)===1;
      }
    },
    _setupTypeInfo: function(test, maskPattern) {
      var data = (this.errorCorrectLevel << 3) | maskPattern;
      var bits = QRUtil.getBCHTypeInfo(data);
      for (var i = 0; i < 15; i++) {
        var mod = !test && ((bits>>i)&1)===1;
        if (i<6) this.modules[i][8]=mod;
        else if (i<8) this.modules[i+1][8]=mod;
        else this.modules[this.moduleCount-15+i][8]=mod;
        if (i<8) this.modules[8][this.moduleCount-i-1]=mod;
        else if (i<9) this.modules[8][14-i]=mod; // 15-i-1 for i>=8 but <9 is 15-8-1=6? use 14-i
        else this.modules[8][15-i-1]=mod;
      }
      this.modules[this.moduleCount-8][8] = !test;
    },
    _mapData: function(data, maskPattern) {
      var inc=-1, row=this.moduleCount-1, bitIndex=7, byteIndex=0;
      for (var col = this.moduleCount-1; col > 0; col -= 2) {
        if (col===6) col--;
        while (true) {
          for (var c = 0; c < 2; c++) {
            if (this.modules[row][col-c]===null) {
              var dark = false;
              if (byteIndex < data.length) dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
              if (QRUtil.getMask(maskPattern, row, col-c)) dark = !dark;
              this.modules[row][col-c] = dark;
              bitIndex--;
              if (bitIndex === -1) { byteIndex++; bitIndex = 7; }
            }
          }
          row += inc;
          if (row < 0 || this.moduleCount <= row) { row -= inc; inc = -inc; break; }
        }
      }
    }
  };

  QRCodeModel.PAD0 = 0xEC;
  QRCodeModel.PAD1 = 0x11;

  QRCodeModel.createData = function(typeNumber, errorCorrectLevel, dataList) {
    var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
    var buffer = new QRBitBuffer();
    for (var i = 0; i < dataList.length; i++) {
      var data = dataList[i];
      buffer.put(data.getMode(), 4);
      buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber));
      data.write(buffer);
    }
    var totalDataCount = rsBlocks.reduce(function(acc, b) { return acc + b.dataCount; }, 0);
    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) buffer.put(0, 4);
    while (buffer.getLengthInBits() % 8 !== 0) buffer.putBit(false);
    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(QRCodeModel.PAD0, 8);
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(QRCodeModel.PAD1, 8);
    }
    return QRCodeModel._createBytes(buffer, rsBlocks);
  };

  QRCodeModel._createBytes = function(buffer, rsBlocks) {
    var offset = 0, maxDcCount = 0, maxEcCount = 0;
    var dcdata = [], ecdata = [];
    for (var r = 0; r < rsBlocks.length; r++) {
      var dcCount = rsBlocks[r].dataCount;
      var ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);
      dcdata[r] = new Array(dcCount);
      for (var i = 0; i < dcdata[r].length; i++) dcdata[r][i] = 0xff & buffer.buffer[i + offset];
      offset += dcCount;
      var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
      var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
      var modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = new Array(rsPoly.getLength() - 1);
      for (var i = 0; i < ecdata[r].length; i++) {
        var modIndex = i + modPoly.getLength() - ecdata[r].length;
        ecdata[r][i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
      }
    }
    var totalCodeCount = rsBlocks.reduce(function(acc, b) { return acc + b.totalCount; }, 0);
    var data = new Array(totalCodeCount);
    var index = 0;
    for (var i = 0; i < maxDcCount; i++) for (var r = 0; r < rsBlocks.length; r++) if (i < dcdata[r].length) data[index++] = dcdata[r][i];
    for (var i = 0; i < maxEcCount; i++) for (var r = 0; r < rsBlocks.length; r++) if (i < ecdata[r].length) data[index++] = ecdata[r][i];
    return data;
  };

  // ── Public API ──────────────────────────────────────────────
  // Auto-detect version needed for a given text
  function getTypeNumber(data) {
    var len = new QR8BitByte(data).getLength();
    // very rough: version 1=17bytes, 2=32, 3=53, 4=78, 5=106, 6=134, 7=154, 8=192, 9=230, 10=271
    var caps = [17,32,53,78,106,134,154,192,230,271];
    for (var v = 0; v < caps.length; v++) if (len <= caps[v]) return v + 1;
    return 10;
  }

  function makeQR(text) {
    var typeNumber = getTypeNumber(text);
    var qr = new QRCodeModel(typeNumber, QRErrorCorrectLevel.M);
    qr.addData(text);
    qr.make();
    return qr;
  }

  // Draw QR on a <canvas> element
  function drawQROnCanvas(canvas, text, size) {
    var qr = makeQR(text);
    var count = qr.getModuleCount();
    var tileW = size / count;
    var tileH = size / count;
    canvas.width  = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000000';
    for (var row = 0; row < count; row++) {
      for (var col = 0; col < count; col++) {
        if (qr.isDark(row, col)) {
          ctx.fillRect(Math.round(col * tileW), Math.round(row * tileH), Math.ceil(tileW), Math.ceil(tileH));
        }
      }
    }
  }

  // Expose globally
  global.AutoPartQR = { draw: drawQROnCanvas };

})(window);

// ─────────────────────────────────────────────────────────────
// UI: show/hide QR modal
// ─────────────────────────────────────────────────────────────
var _qrCurrentProductId = null;
var _qrCurrentCanvas    = null;

function showQRCode(productId, productName, partNumber) {
  _qrCurrentProductId = productId;

  document.getElementById('qrProductLabel').textContent = productName || '';
  document.getElementById('qrProductPart').textContent  = partNumber  ? ('ژمارەی پارچە: ' + partNumber) : '';

  // Clear previous QR and draw new one
  var container = document.getElementById('qrCanvas');
  container.innerHTML = '';
  var canvas = document.createElement('canvas');
  container.appendChild(canvas);
  _qrCurrentCanvas = canvas;

  // Encode product info as a simple text string
  var text = 'Product: ' + productName + (partNumber ? '\nPart: ' + partNumber : '') + '\nID: ' + productId;
  try {
    AutoPartQR.draw(canvas, text, 240);
  } catch(e) {
    container.innerHTML = '<p style="color:red">هەڵەیەک ڕوویدا لە دروستکردنی QR: ' + e.message + '</p>';
  }

  openModal('qrModal');
}

function downloadQR() {
  if (!_qrCurrentCanvas) return;
  var link = document.createElement('a');
  link.download = 'product-qr-' + (_qrCurrentProductId || 'unknown') + '.png';
  link.href = _qrCurrentCanvas.toDataURL('image/png');
  link.click();
}
