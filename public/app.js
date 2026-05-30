// ---- DOM refs ----
var form = document.getElementById('sslForm');
var input = document.getElementById('domainInput');
var btn = document.getElementById('checkBtn');
var btnText = btn.querySelector('.btn-text');
var btnSpinner = btn.querySelector('.btn-spinner');
var errorBox = document.getElementById('errorBox');
var resultsSection = document.getElementById('results');
var navbar = document.getElementById('navbar');

// ---- Navbar scroll shadow ----
var lastScroll = 0;
window.addEventListener('scroll', function() {
  var y = window.pageYOffset;
  if (y > 20) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
  lastScroll = y;
}, { passive: true });

// ---- Mobile menu ----
var mobileToggle = document.getElementById('mobileToggle');
if (mobileToggle) {
  mobileToggle.addEventListener('click', function() {
    var links = document.querySelector('.nav-links');
    if (links) links.classList.toggle('show-mobile');
  });
}

// ---- Smooth scroll for anchor links ----
document.querySelectorAll('a[href^="#"]').forEach(function(link) {
  link.addEventListener('click', function(e) {
    var target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      var offset = 80;
      var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
  });
});

// ---- Form submit ----
form.addEventListener('submit', function(e) {
  e.preventDefault();
  var domain = input.value.trim();
  if (!domain) {
    showError('Please enter a domain name');
    return;
  }
  runCheck(domain);
});

function quickCheck(domain) {
  input.value = domain;
  runCheck(domain);
  // scroll to tool
  var toolSection = document.getElementById('tool');
  if (toolSection) {
    var top = toolSection.getBoundingClientRect().top + window.pageYOffset - 80;
    window.scrollTo({ top: top, behavior: 'smooth' });
  }
}

function runCheck(domain) {
  hideError();
  resultsSection.classList.add('hidden');
  setLoading(true);

  fetch('/api/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain: domain })
  })
  .then(function(res) {
    return res.json().then(function(data) {
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      return data;
    });
  })
  .then(function(data) {
    renderResults(data);
    setLoading(false);
    resultsSection.classList.remove('hidden');

    // smooth scroll to results
    setTimeout(function() {
      var banner = document.querySelector('.score-banner');
      if (banner) {
        var top = banner.getBoundingClientRect().top + window.pageYOffset - 90;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    }, 100);
  })
  .catch(function(err) {
    setLoading(false);
    showError(err.message);
  });
}

function setLoading(on) {
  btn.disabled = on;
  if (on) {
    btnText.classList.add('hidden');
    btnSpinner.classList.remove('hidden');
  } else {
    btnText.classList.remove('hidden');
    btnSpinner.classList.add('hidden');
  }
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.remove('hidden');
}

function hideError() {
  errorBox.classList.add('hidden');
}

function formatDate(iso) {
  var d = new Date(iso);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

function getGradeClass(grade) {
  var ch = grade.charAt(0).toUpperCase();
  if (ch === 'A') return 'grade-a';
  if (ch === 'B') return 'grade-b';
  if (ch === 'C') return 'grade-c';
  if (ch === 'D') return 'grade-d';
  return 'grade-f';
}

function getGradeLabelColor(grade) {
  var ch = grade.charAt(0).toUpperCase();
  if (ch === 'A') return '#12b76a';
  if (ch === 'B') return '#f79009';
  if (ch === 'C') return '#FF642D';
  return '#f04438';
}

// ---- Expand / Collapse ----
function toggleExpand(headEl) {
  headEl.classList.toggle('open');
  var body = headEl.nextElementSibling;
  if (body) {
    if (headEl.classList.contains('open')) {
      body.style.display = 'block';
    } else {
      body.style.display = 'none';
    }
  }
}

// ---- Render ----
function renderResults(data) {
  // Grade badge
  var gradeCard = document.getElementById('gradeCard');
  gradeCard.className = 'grade-badge ' + getGradeClass(data.grade);
  document.getElementById('gradeLetter').textContent = data.grade;

  var gradeLabel = document.getElementById('gradeLabel');
  gradeLabel.textContent = data.gradeLabel;
  gradeLabel.style.color = getGradeLabelColor(data.grade);

  // Domain & status
  document.getElementById('resultDomain').textContent = data.hostname;
  var badge = document.getElementById('statusBadge');
  var statusText = document.getElementById('statusText');
  if (data.isValid) {
    badge.className = 'pill pill-valid';
    statusText.textContent = 'Certificate Valid';
  } else {
    badge.className = 'pill pill-invalid';
    statusText.textContent = data.isExpired ? 'Certificate Expired' : 'Certificate Invalid';
  }

  // Score banner bg tint
  var banner = document.getElementById('scoreBanner');
  if (data.isValid) {
    banner.style.background = '';
  } else {
    banner.style.background = 'linear-gradient(135deg, #1a1520 0%, #271a1a 100%)';
  }

  document.getElementById('checkedAt').textContent = formatDate(data.checkedAt);

  // Expiry ring
  var days = data.validity.daysRemaining;
  var total = data.validity.totalDays;
  document.getElementById('ringDays').textContent = days < 0 ? 0 : days;

  var pct = total > 0 ? Math.max(0, Math.min(1, days / total)) : 0;
  var circ = 2 * Math.PI * 52;
  var offset = circ * (1 - pct);
  var ringFill = document.getElementById('ringFill');
  ringFill.style.strokeDasharray = circ;
  ringFill.style.strokeDashoffset = circ;

  if (days <= 0) ringFill.style.stroke = '#f04438';
  else if (days <= 30) ringFill.style.stroke = '#f79009';
  else ringFill.style.stroke = '#12b76a';

  setTimeout(function() { ringFill.style.strokeDashoffset = offset; }, 80);

  // Detail cards
  document.getElementById('certCN').textContent = data.subject.commonName || '-';
  document.getElementById('certOrg').textContent = data.subject.organization || 'Not specified';
  document.getElementById('certSerial').textContent = data.serialNumber || '-';

  document.getElementById('issuerCN').textContent = data.issuer.commonName || '-';
  document.getElementById('issuerOrg').textContent = data.issuer.organization || '-';
  document.getElementById('issuerCountry').textContent = data.issuer.country || '-';

  document.getElementById('validFrom').textContent = formatDate(data.validity.validFrom);
  document.getElementById('validTo').textContent = formatDate(data.validity.validTo);
  document.getElementById('totalDays').textContent = data.validity.totalDays + ' days';

  document.getElementById('tlsProtocol').textContent = data.protocol;
  document.getElementById('cipherName').textContent = data.cipher ? data.cipher.name : '-';
  document.getElementById('fingerprint').textContent = data.fingerprint || '-';
  document.getElementById('fingerprint').title = data.fingerprint || '';

  // SAN
  var sanTags = document.getElementById('sanTags');
  var sanSection = document.getElementById('sanSection');
  sanTags.innerHTML = '';

  if (data.san && data.san.length > 0) {
    document.getElementById('sanCount').textContent = data.san.length;
    sanSection.classList.remove('hidden');

    // auto-open SAN
    var sanHead = sanSection.querySelector('.ec-head');
    if (sanHead && !sanHead.classList.contains('open')) {
      sanHead.classList.add('open');
      sanHead.nextElementSibling.style.display = 'block';
    }

    data.san.forEach(function(name) {
      var tag = document.createElement('span');
      tag.className = 'san-tag';
      tag.textContent = name;
      sanTags.appendChild(tag);
    });
  } else {
    sanSection.classList.add('hidden');
  }

  // Chain
  var chainList = document.getElementById('chainList');
  var chainSection = document.getElementById('chainSection');
  chainList.innerHTML = '';

  if (data.issuerChain && data.issuerChain.length > 0) {
    chainSection.classList.remove('hidden');

    var chainHead = chainSection.querySelector('.ec-head');
    if (chainHead && !chainHead.classList.contains('open')) {
      chainHead.classList.add('open');
      chainHead.nextElementSibling.style.display = 'block';
    }

    data.issuerChain.forEach(function(cert) {
      var node = document.createElement('div');
      node.className = 'chain-node';
      node.innerHTML =
        '<div class="chain-cn">' + esc(cert.commonName) + '</div>' +
        '<div class="chain-org">Issued by: ' + esc(cert.issuer) +
        (cert.organization ? ' (' + esc(cert.organization) + ')' : '') +
        '</div>';
      chainList.appendChild(node);
    });
  } else {
    chainSection.classList.add('hidden');
  }
}

function esc(str) {
  if (!str) return '';
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}
