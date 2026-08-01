
(function(){
  'use strict';

  var state = {
    courses: [],
    ready: false
  };

  var input = document.getElementById('courseSearch');
  var form = document.getElementById('searchForm');
  var results = document.getElementById('results');
  var feedback = document.getElementById('feedback');
  var clearButton = document.getElementById('clearSearch');
  var quickButtons = document.getElementsByClassName('quick-chip');
  var loading = document.getElementById('loading');
  var errorBanner = document.getElementById('errorBanner');

  function normalise(value){
    return String(value || '')
      .toUpperCase()
      .replace(/[\u2013\u2014]/g,'-')
      .replace(/[^A-Z0-9]/g,'');
  }

  function escapeHtml(value){
    return String(value == null ? '' : value)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  function whatsappUrl(course){
    var programme = course.programme_code || course.programme_name;
    var message = 'Hello GUIDELALA, I want study material for ' +
      course.course_code + ' - ' + course.course_title + ' (' + programme + ').';
    return 'https://wa.me/919599021931?text=' + encodeURIComponent(message);
  }

  function score(course, query, rawTokens){
    var cc = course._courseCode;
    var ct = course._courseTitle;
    var pc = course._programmeCode;
    var pn = course._programmeName;
    var sec = course._section;

    if (cc === query) return 1000;
    if (cc.indexOf(query) === 0) return 900;
    if (pc === query) return 850;
    if (pc && pc.indexOf(query) === 0) return 780;
    if (cc.indexOf(query) >= 0) return 730;
    if (ct.indexOf(query) === 0) return 640;
    if (ct.indexOf(query) >= 0) return 600;
    if (pn.indexOf(query) >= 0) return 500;
    if (sec.indexOf(query) >= 0) return 320;

    if (rawTokens.length > 1) {
      var allTokensMatch = true;
      for (var i = 0; i < rawTokens.length; i++) {
        var token = rawTokens[i];
        if (
          ct.indexOf(token) < 0 &&
          cc.indexOf(token) < 0 &&
          pn.indexOf(token) < 0 &&
          pc.indexOf(token) < 0
        ) {
          allTokensMatch = false;
          break;
        }
      }
      if (allTokensMatch) return 450;
    }

    return -1;
  }

  function renderCourse(course, exact){
    var programmeText = course.programme_code
      ? course.programme_name + ' (' + course.programme_code + ')'
      : course.programme_name;

    var exactTag = exact ? '<span class="product-tag">Exact match</span>' : '';

    return '' +
      '<article class="course-result">' +
        '<div class="course-code">' + escapeHtml(course.course_code) + '</div>' +
        '<div>' +
          '<div class="course-title">' + escapeHtml(course.course_title) + '</div>' +
          '<div class="course-meta"><b>Programme:</b> ' + escapeHtml(programmeText) +
          '<br><b>Year/Semester:</b> ' + escapeHtml(course.section || 'All Courses') + '</div>' +
          '<div class="product-tags">' +
            exactTag +
            '<span class="product-tag">Guide Book</span>' +
            '<span class="product-tag">Solved Guess Paper</span>' +
            '<span class="product-tag">Previous Year Papers</span>' +
            '<span class="product-tag">Exam Preparation Kit</span>' +
          '</div>' +
        '</div>' +
        '<div class="course-actions">' +
          '<a class="course-action primary" href="' + whatsappUrl(course) + '" target="_blank" rel="noopener">' +
            '<img src="icons/whatsapp.svg" alt="">Get this course' +
          '</a>' +
          '<a class="course-action secondary" href="#products">View products</a>' +
        '</div>' +
      '</article>';
  }

  function renderSearch(scrollToResults){
    var raw = input.value.replace(/^\s+|\s+$/g,'');
    var query = normalise(raw);

    clearButton.className = raw ? 'clear-btn show' : 'clear-btn';

    if (!query) {
      results.className = 'results';
      results.innerHTML = '';
      feedback.textContent = 'Enter a course code or programme code.';
      return;
    }

    if (!state.ready) {
      feedback.textContent = 'Catalogue is loading. Please wait a moment…';
      return;
    }

    var rawParts = raw.split(/\s+/);
    var tokens = [];
    for (var t = 0; t < rawParts.length; t++) {
      var token = normalise(rawParts[t]);
      if (token) tokens.push(token);
    }

    var matches = [];
    var exact = [];

    for (var i = 0; i < state.courses.length; i++) {
      var course = state.courses[i];
      var courseScore = score(course, query, tokens);
      if (courseScore >= 0) {
        matches.push({course: course, score: courseScore});
        if (course._courseCode === query) exact.push(course);
      }
    }

    matches.sort(function(a,b){
      if (b.score !== a.score) return b.score - a.score;
      return String(a.course.course_code).localeCompare(String(b.course.course_code));
    });

    results.className = 'results show';

    if (!matches.length) {
      results.innerHTML =
        '<div class="empty"><strong>No matching course found</strong>' +
        'Try a complete code such as <b>MCO-1</b>, <b>MCO1</b>, <b>MCOM</b> or a few words from the course title.</div>';
      feedback.textContent = 'No match found for “' + raw + '”.';
      return;
    }

    var list = exact.length ? exact : [];
    if (!list.length) {
      var max = Math.min(matches.length, 50);
      for (var m = 0; m < max; m++) list.push(matches[m].course);
    }

    var heading = exact.length ? 'Exact course match found' : 'Search results for “' + escapeHtml(raw) + '”';
    var out =
      '<div class="results-head"><strong>' + heading + '</strong>' +
      '<span>' + matches.length + ' matching course' + (matches.length === 1 ? '' : 's') + '</span></div>' +
      '<div class="result-card">';

    var lastProgramme = '';
    for (var j = 0; j < list.length; j++) {
      var currentProgramme = list[j].programme_code || list[j].programme_name;
      if (currentProgramme !== lastProgramme) {
        out += '<div class="programme-banner"><strong>' +
          escapeHtml(list[j].programme_name) +
          '</strong><span>' + escapeHtml(list[j].programme_code || 'Programme') + '</span></div>';
        lastProgramme = currentProgramme;
      }
      out += renderCourse(list[j], exact.length > 0);
    }
    out += '</div>';

    results.innerHTML = out;
    feedback.textContent = exact.length
      ? 'Exact course found: ' + exact[0].course_code
      : matches.length + ' matching course' + (matches.length === 1 ? '' : 's') + ' found.';
    results.scrollTop = 0;

    if (scrollToResults) {
      window.setTimeout(function(){
        try { results.scrollIntoView({behavior:'smooth',block:'nearest'}); }
        catch(e) { results.scrollIntoView(true); }
      },40);
    }
  }

  function loadCatalogue(){
    loading.className = 'loading show';

    fetch('courses.json', {cache:'no-store'})
      .then(function(response){
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function(payload){
        var courses = payload.courses || [];
        for (var i = 0; i < courses.length; i++) {
          courses[i]._courseCode = normalise(courses[i].course_code);
          courses[i]._courseTitle = normalise(courses[i].course_title);
          courses[i]._programmeCode = normalise(courses[i].programme_code);
          courses[i]._programmeName = normalise(courses[i].programme_name);
          courses[i]._section = normalise(courses[i].section);
        }
        state.courses = courses;
        state.ready = true;
        loading.className = 'loading';
        feedback.textContent = 'Ready — search ' + courses.length + ' IGNOU courses.';
      })
      .catch(function(){
        loading.className = 'loading';
        errorBanner.className = 'error-banner show';
        errorBanner.innerHTML =
          'The course database could not load. Confirm that <b>courses.json</b> is uploaded in the same folder as <b>index.html</b>.';
        feedback.textContent = 'Course database unavailable.';
      });
  }

  form.addEventListener('submit',function(event){
    event.preventDefault();
    renderSearch(true);
    try { input.blur(); } catch(e) {}
  });

  input.addEventListener('input',function(){ renderSearch(false); });
  input.addEventListener('keydown',function(event){
    if (event.key === 'Enter') {
      event.preventDefault();
      renderSearch(true);
      try { input.blur(); } catch(e) {}
    }
  });

  clearButton.addEventListener('click',function(){
    input.value = '';
    renderSearch(false);
    input.focus();
  });

  for (var q = 0; q < quickButtons.length; q++) {
    quickButtons[q].addEventListener('click',function(){
      input.value = this.getAttribute('data-query') || '';
      renderSearch(true);
    });
  }

  loadCatalogue();
}());
