// Ratings and feedback store for the Sibara website, kept in a Google Sheet.
// Paste this into Extensions > Apps Script of the sheet and deploy it as a web app (see HOW-TO-EDIT.md).
// GET returns every review; POST adds one. To remove a review, delete its row in the sheet.
var SHEET = 'Feedback';

function sheet_() {
  var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.appendRow(['Date', 'Card', 'Stars', 'Name', 'Comment']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// Plain text only, trimmed, and never starting with a character the sheet would treat as a formula.
function clean_(s, max) {
  s = String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function doGet() {
  var rows = sheet_().getDataRange().getValues().slice(1);
  var reviews = rows.filter(function (r) { return r[1] && Number(r[2]) >= 1 && Number(r[2]) <= 5; }).map(function (r) {
    return {
      card: String(r[1]),
      stars: Math.round(Number(r[2])),
      name: String(r[3] || '').replace(/^'/, ''),
      comment: String(r[4] || '').replace(/^'/, ''),
      date: r[0] instanceof Date ? Utilities.formatDate(r[0], 'Africa/Johannesburg', 'yyyy-MM-dd') : String(r[0] || '')
    };
  });
  return json_({ok: true, reviews: reviews});
}

function doPost(e) {
  var d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ok: false, error: 'Bad request'}); }
  if (d.website) return json_({ok: true}); // honeypot field that only bots fill in
  var card = clean_(d.card, 120), stars = Math.round(Number(d.stars));
  if (!card || !(stars >= 1 && stars <= 5)) return json_({ok: false, error: 'Pick 1 to 5 stars'});
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sheet_().appendRow([new Date(), card, stars, clean_(d.name, 60), clean_(d.comment, 600)]);
  } finally {
    lock.releaseLock();
  }
  return json_({ok: true});
}
