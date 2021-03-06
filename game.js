var game = {
  level: parseInt(localStorage.level, 10) || 0,
  answers: (localStorage.answers && JSON.parse(localStorage.answers)) || {},
  solved: (localStorage.solved && JSON.parse(localStorage.solved)) || [],

  start: function() {
    $('#level-counter .total').text(levels.length);
    $('#editor').show();
    $('#share').hide();

    $('#submit').on('click', function() {
      var level = levels[game.level];
      var code = $('#code').val();
      var selector = level.selector || '';
      $('#pond ' +  selector).attr('style', code);
      $('#code').focus();

      game.saveAnswer();
      game.check(level);
    });

    $('#code').on('keydown', function(e) {
      if (e.keyCode === 13) {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          $('#submit').click();
          return;
        }

        var max = $(this).data('lines');
        var code = $(this).val();
        var trim = code.trim();
        var codeLength = code.split('\n').length;
        var trimLength = trim.split('\n').length;

        if (codeLength >= max) {

          if (codeLength === trimLength) {
            e.preventDefault();
            $('#submit').click();
          } else {
            $('#code').focus().val('').val(trim);
          }
        }
      }
    });

    $('#editor').on('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function() {
      $(this).removeClass();
    });

    $('#levels').on('click', '.reset', function() {
      var r = confirm('Are you sure you want to reset the game?\n\nYour saved progress will be lost and you\'ll be sent to the start of the game.');

      if (r) {
        game.level = 0;
        game.answers = {};
        game.solved = [];
        game.loadLevel(levels[0]);

        $('.level-marker').removeClass('solved');
      }
    });

    $(window).on('beforeunload', function() {
      game.saveAnswer();
      localStorage.setItem('level', game.level);
      localStorage.setItem('answers', JSON.stringify(game.answers));
      localStorage.setItem('solved', JSON.stringify(game.solved));
    });

    this.loadMenu();
    game.loadLevel(levels[game.level]);
  },

  prev: function() {
    this.level--;

    var levelData = levels[this.level];
    this.loadLevel(levelData);
  },

  next: function() {
    this.level++;

    var levelData = levels[this.level];
    this.loadLevel(levelData);
  },

  loadMenu: function() {
    levels.forEach(function(level, i) {
      var levelMarker = $('<span/>').addClass('level-marker').attr('data-level', i).text(i+1);

      if ($.inArray(level.name, game.solved) !== -1) {
        levelMarker.addClass('solved');
      }

      levelMarker.appendTo('#levels');
    });

    var reset = $('<div/>').addClass('reset').text('Reset');
    $('#levels').append(reset);

    $('.level-marker').on('click', function() {
      game.saveAnswer();

      var level = $(this).attr('data-level');
      game.level = parseInt(level, 10);
      game.loadLevel(levels[level]);
    });

    $('#level-indicator').on('click', function() {
      $('#levels').toggleClass('show');
    });

    $('.arrow.left').on('click', function() {
      if (!$(this).hasClass('disabled')) {
        game.saveAnswer();
        game.prev();
      }
    });

    $('.arrow.right').on('click', function() {
      if (!$(this).hasClass('disabled')) {
        game.saveAnswer();
        game.next();
      }
    });
  },

  loadLevel: function(level) {
    $('#editor').show();
    $('#share').hide();
    $('#background, #pond').removeClass('wrap').attr('style', '').empty();
    $('#levels').removeClass('show');
    $('.level-marker').removeClass('current').eq(this.level).addClass('current');

    var answer = game.answers[level.name];
    $('#code').val(answer).focus();

    $('#level-counter .current').text(this.level + 1);
    $('#instructions').html(level.instructions);
    $('#before').text(level.before);
    $('#after').text(level.after);

    $('.arrow.disabled').removeClass('disabled');

    if (this.level === 0) {
      $('.arrow.left').addClass('disabled');
    }

    if (this.level === levels.length - 1) {
      $('.arrow.right').addClass('disabled');
    }

    this.loadDocs();

    var lines = Object.keys(level.style).length;
    $('#code').height(20 * lines).data("lines", lines);

    var string = level.board;
    var markup = '';
    var colors = {
      'g': 'green',
      'r': 'red',
      'y': 'yellow'
    };

    for (var i = 0; i < string.length; i++) {
      var c = string.charAt(i);
      var color = colors[c];

      var lilypad = $('<div/>').addClass('lilypad ' + color).data('color', color);
      var frog = $('<div/>').addClass('frog ' + color).data('color', color);

      $('<div/>').addClass('bg').css(game.transform()).appendTo(lilypad);
      $('<div/>').addClass('bg animated pulse infinite').appendTo(frog);

      $('#background').append(lilypad);
      $('#pond').append(frog);
    }

    var classes = level.classes;

    if (classes) {
      for (var rule in classes) {
        $(rule).addClass(classes[rule]);
      }
    }

    var selector = level.selector || '';
    $('#background ' + selector).css(level.style);
  },

  loadDocs: function() {
    $('#instructions code').each(function() {
      var code = $(this);
      var text = code.text();

      if (docs.hasOwnProperty(text)) {
        code.addClass('help');

        code.on('mouseenter', function(e) {

          if ($('#instructions .tooltip').length === 0) {
            var tooltip = $('<div class="tooltip"></div>').html(docs[text]);
            var tooltipX = code.offset().left;
            var tooltipY = code.offset().top + code.height() + 13;

            tooltip.css({top: tooltipY, left: tooltipX}).appendTo($('#instructions'));
          }
        }).on('mouseleave', function() {
          $('#instructions .tooltip').remove();
        });
      }
    });
  },

  check: function(level) {
    var lilypads = {};
    var frogs = {};
    var correct = true;

    $('.frog').each(function() {
      var position = $(this).position();
      position.top = Math.floor(position.top);
      position.left = Math.floor(position.left);

      var key = JSON.stringify(position);
      var val = $(this).data('color');
      frogs[key] = val;
    });

    $('.lilypad').each(function() {
      var position = $(this).position();
      position.top = Math.floor(position.top);
      position.left = Math.floor(position.left);

      var key = JSON.stringify(position);
      var val = $(this).data('color');

      if (!(key in frogs) || frogs[key] !== val) {
        correct = false;
      }
    });

    if (correct) {
      ga('send', {
        hitType: 'event',
        eventCategory: level.name,
        eventAction: 'correct',
        eventLabel: $('#code').val()
      });

      if ($.inArray(level.name, game.solved) === -1) {
        game.solved.push(level.name);
      }

      $('[data-level=' + game.level + ']').addClass('solved');
      $('.frog').addClass('animated bounceOutUp');
      $('.arrow').addClass('disabled');

      setTimeout(function() {
        if (game.level >= levels.length - 1) {
          game.win();
        } else {
          game.next();
        }
      }, 2500);

      
    } else {
      ga('send', {
        hitType: 'event',
        eventCategory: level.name,
        eventAction: 'incorrect',
        eventLabel: $('#code').val()
      });

      this.tryagain();
    }
  },

  saveAnswer: function() {
    var level = levels[this.level];
    game.answers[level.name] = $('#code').val();
  },

  tryagain: function() {
    $('#editor').addClass('animated shake');
  },

  win: function() {
    var level =   {
        name: 'win',
        instructions: '<p>You win! Thanks to your mastery of flexbox, you were able to help all of the frogs to their lilypads. Just look how hoppy they are!</p>',
        board: 'gyrgyrgyrgyrgyrgyrgyrgyrg',
        classes: {'#pond, #background': 'wrap'},
        style: {},
        before: "#pond {\n  display: flex;\n",
        after: "}",
      };

    var solution = $('#code').val();

    this.loadLevel(level);

    $('#editor').hide();
    $('#code').val(solution);
    $('#share').show();
    $('.frog .bg').removeClass('pulse').addClass('bounce');
  },

  transform: function() {
    var scale = 1 + ((Math.random() / 5) - 0.2);
    var rotate = 360 * Math.random();

    return {'transform': 'scale(' + scale + ') rotate(' + rotate + 'deg)'};
  }
};

$(document).ready(function() {
  game.start();
});
