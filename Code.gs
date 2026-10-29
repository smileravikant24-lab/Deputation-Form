const SHEET_NAME = 'Dep Form New Delhi';
const DRIVE_FOLDER_NAME = 'Dep Form New Delhi';
const HEADERS = [
  'Timestamp', 'Name', 'Designation', 'Stream', 'Gender', 'Mobile', 'Email', 'Date of Birth', 'Age (years)',
  'Location for Deputation', 'Qualification - Educational', 'Qualification - Professional', 'Parent Office',
  'Present Office', 'Present Office (Other)', 'SC/ST', 'Category', 'Date of Entry into Govt Service',
  'Date of Entry in IA&AD',

  'Year of Passing SOG Exam',
  'Departmental Exams (JSON)',
  'Date of promotion/appointment as AAO',
  'Date of promotion/appointment as SAO',

  'As on Date', 'Years completed in the grade',
  'Pay Level', 'Pay Amount',
  'Working Experience (JSON)',
  
  'Merit', 'Merit Details',
  'Achievements', 'Achievements Details',
  'Other Info', 'Other Info Details',
  'Photo File URL', 'Signature File URL', 'Record ID'
];

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  getOrCreateUploadsFolderId_();
}

function doGet(e) {
  var expiryDateStr = "2026-05-02"; 
  var expiryDate = new Date(expiryDateStr);
  var currentDate = new Date(); 

  expiryDate.setHours(23, 59, 59, 999);

  if (currentDate > expiryDate) {
    return HtmlService.createHtmlOutput("<h2 style='color:red; text-align:center;'>Registration Date is Over!</h2>");
  }

  // If called as an API ping
  if (e && e.parameter && e.parameter.action === 'ping') {
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Deputation Form API is active' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    return HtmlService.createTemplateFromFile('Index').evaluate()
      .setTitle('Deputation Form')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return HtmlService.createHtmlOutput("<h3 style='font-family:sans-serif; text-align:center;'>Deputation Form API Ready. Access via GitHub Pages frontend.</h3>");
  }
}

/**
 * Universal doPost API Handler
 * Handles external requests from GitHub Pages or web clients
 */
function doPost(e) {
  try {
    var raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    var data = JSON.parse(raw);
    var action = data.action || (e && e.parameter ? e.parameter.action : '');
    var payload = data.payload !== undefined ? data.payload : data;

    var result;
    if (action === 'sendEmailOTP') {
      var email = typeof payload === 'string' ? payload : (payload.email || '');
      result = sendEmailOTP(email);
    } else if (action === 'verifyEmailOTP') {
      result = verifyEmailOTP(payload);
    } else if (action === 'saveForm') {
      result = saveForm(payload);
    } else {
      throw new Error('Unknown action: ' + action);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateUploadsFolderId_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('UPLOADS_FOLDER_ID_SAO');
  if (!id) {
    const folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
    if (folders.hasNext()) {
      id = folders.next().getId();
    } else {
      id = DriveApp.createFolder(DRIVE_FOLDER_NAME).getId();
    }
    props.setProperty('UPLOADS_FOLDER_ID_SAO', id);
  }
  return id;
}

function yearsBetween_(from, to) {
  if (!from || !to) return '';
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const y = toDate.getFullYear() - fromDate.getFullYear();
  const m = toDate.getMonth() - fromDate.getMonth();
  const d = toDate.getDate() - fromDate.getDate();
  const years = (m < 0 || (m === 0 && d < 0)) ? (y - 1) : y;
  return years < 0 ? 0 : years;
}

function sendEmailOTP(email) {
  if (!/^[^@]+@cag\.gov\.in$/i.test(email)) {
    throw new Error('Please enter a valid @cag.gov.in email address.');
  }
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const cache = CacheService.getScriptCache();
  cache.put('email_otp_' + email.toLowerCase(), otp, 600);

  const subject = 'Your OTP for Deputation Form (SAO/AAO)';
  const body = `<p>Dear Applicant,</p><p>Your One-Time Password (OTP) is: <strong>${otp}</strong></p><p>This OTP is valid for 10 minutes.</p><p>Regards,<br>IA&AD Admin</p>`;
  
  try {
    MailApp.sendEmail({ to: email, subject: subject, htmlBody: body, name: 'Deputation Form AAO/SAO' });
    return { ok: true, message: `OTP sent successfully to ${email}` };
  } catch (error) {
    Logger.log('Email sending failed: ' + error.toString());
    throw new Error('Failed to send OTP. Please check the email address or try again later.');
  }
}

function verifyEmailOTP(payload) {
  const { email, otp } = payload;
  if (!email || !otp) throw new Error('Email and OTP are required.');

  const cache = CacheService.getScriptCache();
  const storedOtp = cache.get('email_otp_' + email.toLowerCase());

  if (storedOtp === null) {
    return { verified: false, message: 'OTP has expired. Please request a new one.' };
  }

  if (storedOtp === otp) {
    cache.remove('email_otp_' + email.toLowerCase());
    return { verified: true, message: 'Email address verified successfully.' };
  } else {
    return { verified: false, message: 'Invalid OTP. Please check and try again.' };
  }
}

function saveForm(payload) {
  try {
    if (!payload || !payload.email) throw new Error('Email is required.');
    if (!payload.photo || !payload.photo.content) throw new Error('Photo is required.');
    if (!payload.signature || !payload.signature.content) throw new Error('Signature is required.');

    const designation = payload.designation;
    let gradeDate = null;
    if (designation === 'SAO') gradeDate = payload.dateSAO ? new Date(payload.dateSAO) : null;
    else if (designation === 'AAO') gradeDate = payload.dateAAO ? new Date(payload.dateAAO) : null;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);

    const now = new Date();
    const asOn = payload.asOnDate ? new Date(payload.asOnDate) : new Date();
    const dob = payload.dob ? new Date(payload.dob) : null;
    const ageYears = dob ? yearsBetween_(dob, asOn) : '';
    const yearsInGrade = gradeDate ? yearsBetween_(gradeDate, asOn) : '';
    if (designation === 'AAO' && (yearsInGrade === '' || yearsInGrade < 5)) {
        throw new Error('Eligibility Error: Minimum 5 years of service in AAO grade is required.');
    }
    const recordId = 'REC-SAO-' + Math.floor(now.getTime() / 1000);
    const folder = DriveApp.getFolderById(getOrCreateUploadsFolderId_());
    const saveFile = (data, prefix) => {
      const blob = Utilities.newBlob(Utilities.base64Decode(data.content), data.mimeType, `${prefix}_${payload.name}_${recordId}`);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return file;
    };
    const photoFile = saveFile(payload.photo, 'Photo');
    const sigFile = saveFile(payload.signature, 'Sig');

    const row = [
      now, payload.name, payload.designation, payload.stream, payload.gender, "'" + payload.mobile, payload.email,
      payload.dob, ageYears, payload.location, payload.qualEducational, payload.qualProfessional,
      payload.parentOffice, payload.presentOffice, payload.presentOfficeOther,
      payload.scst, payload.category, payload.entryGovt, payload.entryIAAD,

      payload.sogYear || '',
      JSON.stringify(payload.exams || []), 
      payload.dateAAO || '',
      payload.dateSAO || '',

      payload.asOnDate, yearsInGrade,
      payload.payLevel, payload.payAmount,
      JSON.stringify(payload.experience || []), 

      payload.merit, payload.meritDetails,
      payload.achievements, payload.achievementsDetails,
      payload.otherInfo, payload.otherInfoDetails,
      photoFile.getUrl(), sigFile.getUrl(), recordId
    ];
    sheet.appendRow(row);

    let pdfUrl = '';
    try {
      pdfUrl = createPdf_(payload, recordId, now, photoFile, sigFile, folder, ageYears, yearsInGrade);
    } catch (e) {
      Logger.log('PDF Gen Error: ' + e);
    }

    return { ok: true, id: recordId, message: 'Saved successfully.', pdfUrl: pdfUrl };

  } catch (error) {
    Logger.log('saveForm Error: ' + error.message);
    throw error;
  }
}

function createPdf_(d, refId, dateObj, photoFile, sigFile, folder, age, yearsInGrade) {
  const formatDate = (ds) => ds ? Utilities.formatDate(new Date(ds), Session.getScriptTimeZone(), "dd/MM/yyyy") : '-';
  const dateTimeStr = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
  
  let examsHtml = '-';
  if (d.exams && d.exams.length > 0) {
    examsHtml = `<ul style="margin:0; padding-left:15px; list-style-type: square;">` + 
      d.exams.map(e => `<li><strong>${e.exam}</strong> <span style="color:#6b7280;">(${e.year})</span></li>`).join('') + `</ul>`;
  }

  let expHtml = '-';
  if (d.experience && d.experience.length > 0) {
    expHtml = `<table style="width:100%; border-collapse: collapse; font-size: 11px; margin-top: 5px; border: 1px solid #e5e7eb; table-layout: fixed;">
      <thead>
        <tr style="background:#f9fafb; color:#374151;">
          <th style="border:1px solid #e5e7eb; padding:8px; text-align:left; width: 30%;">Category</th>
          <th style="border:1px solid #e5e7eb; padding:8px; text-align:left; width: 70%;">Details</th>
        </tr>
      </thead>
      <tbody>
      ${d.experience.map(e => `
        <tr>
          <td style="border:1px solid #e5e7eb; padding:8px; color:#111827; font-weight:600; vertical-align:top;">${e.category}</td>
          <td style="border:1px solid #e5e7eb; padding:8px; color:#374151; vertical-align:top; word-wrap: break-word;">${e.details || '-'}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  }

  const photoB64 = Utilities.base64Encode(photoFile.getBlob().getBytes());
  const sigB64 = Utilities.base64Encode(sigFile.getBlob().getBytes());
  const photoMime = photoFile.getMimeType();
  const sigMime = sigFile.getMimeType();

  const rowHtml = (l, v) => `<div class="pv-row"><div class="pv-label">${l}</div><div class="pv-val">${v || '-'}</div></div>`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; margin: 30px; color: #1f2937; line-height: 1.4; }
        .pv-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 15px; border-bottom: 2px solid #e5e7eb; margin-bottom: 0; }
        .pv-header h2 { font-size: 24px; font-weight: 800; margin: 0; color: #111827; text-transform: uppercase; }
        .pv-sub { font-size: 14px; font-weight: 600; color: #4b5563; margin-top: 5px; }
        .pv-meta-strip { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 2px solid #e5e7eb; margin-bottom: 25px; font-size: 11px; color: #6b7280; font-weight: 700; background: #fdfdfd; }
        .pv-photo-box img { height: 120px; width: 100px; object-fit: cover; border: 2px solid #e5e7eb; padding: 4px; border-radius: 4px; }
        .pv-section { margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
        .pv-sec-title { background: #f3f4f6; padding: 8px 12px; font-weight: 700; font-size: 13px; border-bottom: 1px solid #e5e7eb; color: #374151; }
        .pv-row { display: flex; border-bottom: 1px solid #f3f4f6; font-size: 12px; }
        .pv-row:last-child { border-bottom: none; }
        .pv-label { width: 40%; padding: 8px 12px; background: #fafafa; color: #4b5563; font-weight: 600; border-right: 1px solid #f3f4f6; }
        .pv-val { width: 60%; padding: 8px 12px; color: #111827; word-break: break-word; white-space: pre-line; }
        .pv-footer { margin-top: 30px; text-align: right; }
        .pv-sig-box { display: inline-block; text-align: center; }
        .pv-sig-box img { height: 60px; border: 1px solid #e5e7eb; padding: 4px; border-radius: 4px; min-width: 100px; display: block; margin: 0 auto 5px auto; }
        .pv-sig-box div { font-size:10px; font-weight:700; color:#6b7280; }
      </style>
    </head>
    <body>
      <div class="pv-header">
        <div>
          <h2>DEPUTATION APPLICATION FORM</h2>
          <div class="pv-sub">SAO / AAO Cadre</div>
        </div>
        <div class="pv-photo-box">
          <img src="data:${photoMime};base64,${photoB64}">
        </div>
      </div>
      <div class="pv-meta-strip">
         <span>REF ID: <span style="color:#111827;">${refId}</span></span>
         <span>DATE: <span style="color:#111827;">${dateTimeStr}</span></span>
      </div>
      <div class="pv-section">
        <div class="pv-sec-title">Part 1: Common Details</div>
        ${rowHtml('Name', d.name)}
        ${rowHtml('Designation', d.designation)}
        ${rowHtml('Stream', d.stream)}
        ${rowHtml('Gender', d.gender)}
        ${rowHtml('Mobile', d.mobile)}
        ${rowHtml('Email', d.email)}
        ${rowHtml('Date of Birth', formatDate(d.dob))}
        ${rowHtml('Age', age)}
        ${rowHtml('Location', d.location)}
        ${rowHtml('Qual. (Edu)', d.qualEducational)}
        ${rowHtml('Qual. (Prof)', d.qualProfessional)}
        ${rowHtml('Parent Office', d.parentOffice)}
        ${rowHtml('Present Office', d.presentOffice === 'Other' ? d.presentOfficeOther : d.presentOffice)}
        ${rowHtml('SC/ST', d.scst)}
        ${d.scst === 'Yes' ? rowHtml('Category', d.category) : ''}
        ${rowHtml('Date Entry Govt', formatDate(d.entryGovt))}
        ${rowHtml('Date Entry IA&AD', formatDate(d.entryIAAD))}
      </div>
      <div class="pv-section">
        <div class="pv-sec-title">Part 2: For SAO / AAO</div>
        ${rowHtml('Year of passing SOG', d.sogYear)}
        ${rowHtml('Departmental Exams', examsHtml)}
        ${rowHtml('Date of promotion as AAO', formatDate(d.dateAAO))}
        ${d.designation === 'SAO' ? rowHtml('Date of promotion as SAO', formatDate(d.dateSAO)) : ''}
        ${rowHtml('As on Date', formatDate(d.asOnDate))}
        ${rowHtml('Years in Grade', yearsInGrade)}
        ${rowHtml('Present Pay Level', 'Level ' + d.payLevel)}
        ${rowHtml('Pay Amount', d.payAmount)}

        <div class="pv-row" style="flex-direction: column;">
           <div class="pv-label" style="width:100%; border-right:none; border-bottom:1px solid #f3f4f6;">Working Experience</div>
           <div class="pv-val" style="width:100%; padding:10px;">${expHtml}</div>
        </div>
        ${rowHtml('Merit', d.merit)}
        ${d.merit === 'Yes' ? rowHtml('Merit Details', d.meritDetails) : ''}
        ${rowHtml('Achievements', d.achievements)}
        ${d.achievements === 'Yes' ? rowHtml('Achievements Details', d.achievementsDetails) : ''}
        ${rowHtml('Other Info', d.otherInfo)}
        ${d.otherInfo === 'Yes' ? rowHtml('Other Info Details', d.otherInfoDetails) : ''}
      </div>
      <div class="pv-section" style="padding:10px; font-weight:600; font-size:11px;">
         ☑ The information furnished above are correct to the best of my knowledge.
      </div>
      <div style="border-bottom: 2px solid #e5e7eb; margin: 30px 0;"></div>
      
      <div class="pv-footer">
        <div class="pv-sig-box">
          <img src="data:${sigMime};base64,${sigB64}">
          <div>SIGNATURE</div>
        </div>
      </div>
      
      <div style="text-align:center; font-size:10px; color:#9ca3af; margin-top:20px;">System Generated Receipt</div>
    </body>
    </html>`;

  const blob = Utilities.newBlob(html, MimeType.HTML).getAs(MimeType.PDF);
  blob.setName(`${d.name} - Deputation Form (SAO_AAO) Receipt.pdf`);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}
