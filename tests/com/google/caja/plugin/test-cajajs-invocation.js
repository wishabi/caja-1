// Copyright (C) 2011 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Tests of different ways to invoke the 'caja.js' API to
 * create an ES53 frame.
 *
 * @author ihab.awad@gmail.com
 * @requires caja, jsunitRun, readyToTest, minifiedMode,
 *     basicCajaConfig
 */

(function () {
  document.title += ' {closured=' + !caja.closureCanary + '}';

  /**
   * Assert that a cajoled and loaded fixture-guest.js has the right
   * results.
   */
  function assertGuestJsCorrect(frame, div, result) {
    // TODO(kpreid): reenable or declare completion value unsupported
    //assertEquals(12, result);
    console.warn('JS completion value not yet supported by ES5 mode; '
        + 'not testing.');
  }

  /**
   * Assert that a cajoled and loaded fixture-guest.html has the right
   * results.
   */
  function assertGuestHtmlCorrect(frame, div, opt_containerDoc) {
    var containerDoc = opt_containerDoc || document;
    assertStringContains('static html', div.innerHTML);
    assertStringContains('edited html', div.innerHTML);
    assertStringContains('dynamic html', div.innerHTML);
    assertStringContains('external script', div.innerHTML);
    assertEquals('small-caps',
        containerDoc.defaultView.getComputedStyle(
            containerDoc.getElementById('foo-' + frame.idSuffix),
            null).fontVariant);
    assertEquals('inline',
      containerDoc.defaultView.getComputedStyle(
          containerDoc.getElementById('hello-' + frame.idSuffix),
          null).display);
  }

  /**
   * Assert that a guest frame *without* a document has an about:blank-like
   * trivial DOM.
   */
  function assertEmptyGuestHtmlCorrect(frame, div) {
    var guestHtml = '<html><head></head><body></body></html>'.replace(
        /<\/?/g, function(m) { return m + 'caja-v-'; });
    assertEquals(guestHtml,
        div.getElementsByClassName('caja-vdoc-inner')[0].innerHTML);
  }


  // NOTE: Identity URI rewriter (as shown below) is for testing only; this
  // would be unsafe for production code because of HTTP AUTH based phishing.
  var uriPolicy = caja.policy.net.ALL;
  var xhrUriPolicy = {
    fetch: caja.policy.net.fetcher.USE_XHR,
    rewrite: caja.policy.net.rewriter.ALL
  };

  caja.initialize(basicCajaConfig);

  jsunitRegister('testCorrectMinified', function testCorrectMinified() {
    assertEquals(minifiedMode, !caja.closureCanary);
    jsunitPass('testCorrectMinified');
  });

  jsunitRegister('testReinitialization', function testReinitialization() {
    try {
      caja.initialize(basicCajaConfig);
    } catch (e) {
      assertStringContains('Caja cannot be initialized more than once', 
          String(e));
      jsunitPass('testReinitialization');
    }
  });

  function testScriptError(hasDOM) {
    caja.load(hasDOM ? createDiv() : undefined, uriPolicy,
        jsunitCallback(function(frame) {
      var url = 'http://caja-test-error-page.invalid';
      var onerrorFired = 0;
      frame.code(
          url,
          'text/javascript',
          'throw new Error("toplevel error");')
          .api({
            onerror: frame.tame(frame.markFunction(
                jsunitCallback(function(msg, loc, line, col, error) {
              onerrorFired++;
              assertEquals('Uncaught Error: toplevel error', msg);
              assertEquals(url, loc);
              assertEquals(-1, line);
              assertEquals(-1, col);
              assertEquals('[object Error]',
                  Object.prototype.toString.call(error));
            })))
          })
          .run(jsunitCallback(function(result) {
            assertEquals(1, onerrorFired);
            jsunitPass();
          }));
    }));
  }
  jsunitRegister('testScriptErrorWithDom', function() {
      testScriptError(true); });

  jsunitRegister('testScriptErrorWithoutDom', function() {
      testScriptError(false); });

  jsunitRegister('testDefaultHeight', function testDefaultHeight() {
    var hostPageDiv = createDiv();

    var div = document.createElement('div');
    hostPageDiv.appendChild(div);
    caja.load(div, uriPolicy, function (frame) {
      frame.code(
          location.protocol + '//' + location.host + '/',
          'text/html',
          '<div id="foo">testDefaultHeight</div>')
          .run(function(result) {
              var computedHeight =
                parseInt(document.defaultView.getComputedStyle(
                  div,
                  null).height)
              assertTrue(computedHeight < 30);
              jsunitPass('testDefaultHeight');
           });
    });
  });

  jsunitRegister('testFullHeight', function testFullHeight() {
    var hostPageDiv = createDiv();
    hostPageDiv.style.height = "100px";

    var stylesheet = document.createElement('style');
    stylesheet.type = 'text/css';
    stylesheet.textContent =
        '.enableFullHeight .caja-vdoc-wrapper { height: 100%; }';
    document.getElementsByTagName('head')[0].appendChild(stylesheet);

    var div = document.createElement('div');
    div.className = 'enableFullHeight';
    // Host page styles the container div
    div.style.height = '100%';
    hostPageDiv.appendChild(div);
    caja.load(div, uriPolicy, function (frame) {
      frame.code(
          location.protocol + '//' + location.host + '/',
          'text/html',
          '<style>html, body { height: 100%; }</style>' +
              '<div id="foo" style="height:100%">testFullHeight</div>')
          .run(function(result) {
              var computedHeight =
                parseInt(document.defaultView.getComputedStyle(
                  document.getElementById('foo-' + frame.idSuffix),
                  null).height)
              assertEquals(100, computedHeight);
              jsunitPass('testFullHeight');
           });
    });
  });

  jsunitRegister('testTightHeight', function testTightHeight() {
    var hostPageDiv = createDiv();
    hostPageDiv.style.height = "100px";

    var div = document.createElement('div');
    // Host page default style tightly wraps div
    // div.style.height
    hostPageDiv.appendChild(div);
    caja.load(div, uriPolicy, function (frame) {
      frame.code(
          location.protocol + '//' + location.host + '/',
          'text/html',
          '<div id="foo" style="height:100%">testTightHeight</div>')
          .run(function(result) {
              var computedHeight =
                parseInt(document.defaultView.getComputedStyle(
                  document.getElementById('foo-' + frame.idSuffix),
                  null).height)
              assertTrue(computedHeight < 100);
              jsunitPass('testTightHeight');
           });
    });
  });

  function readPub(obj, name) {
    if (obj.v___) {  // ES5/3
      return obj.v___(name);
    } else {
      return obj[name];
    }
  }
  jsunitRegister('testVdocWrapperInterface', function testVdocWrapperInterface() {
    var div = createDiv();
    caja.load(div, uriPolicy, function (frame) {
      frame.code(
          location.protocol + '//' + location.host + '/',
          'text/html',
          '<div>testVdocWrapperInterface</div>')
          .run(function(result) {
              var innermost = frame.domicile.feralNode(
                  readPub(frame.domicile.document, 'documentElement')
                  ).parentNode;
              assertTrue('i', innermost.classList.contains('caja-vdoc-inner'));
              var last;
              for (var el = innermost;
                  el !== div;
                  last = el, el = el.parentNode) {
                assertTrue('w', el.classList.contains('caja-vdoc-wrapper'));
                last = el;
              }
              assertTrue('o',
                  last.classList.contains('caja-vdoc-outer'));
              jsunitPass('testVdocWrapperInterface');
           });
    });
  });

  jsunitRegister('testBuilderApiHtml', function testBuilderApiHtml() {
    var div = createDiv();
    caja.load(div, uriPolicy, function (frame) {
      frame.code('fixture-guest.html', 'text/html')
           .run(function(result) {
              assertGuestHtmlCorrect(frame, div);
              jsunitPass('testBuilderApiHtml');
           });
    });
  });

  jsunitRegister('testBuilderApiXhr', function testBuilderApiXhr() {
    var div = createDiv();
    caja.load(div, xhrUriPolicy, function (frame) {
      frame.code('fixture-guest.html', 'text/html')
           .run(function(result) {
              assertGuestHtmlCorrect(frame, div);
              jsunitPass('testBuilderApiXhr');
           });
    });
  });

  jsunitRegister('testUnicodeInCodeFails', function testUnicodeInCodeFails() {
    var code =
      '<script> var x = 42; </script>' +
      '<script> x++; var te\ufeffst = 1; </script>' + // should not run
      '<script> record(x); </script>';
    var xValue = 0;
    var div = createDiv();
    caja.load(div, xhrUriPolicy, jsunitCallback(function(frame) {
      frame.code('http://example.com/', 'text/html', code)
           .api({
             record: frame.tame(frame.markFunction(function(x) {
               xValue = x;
             }))
           })
           .run(jsunitCallback(function(result) {
             assertEquals(42, xValue);
             jsunitPass('testUnicodeInCodeFails');
           }));
    }));
  });

  jsunitRegister('testUnicodeInStringOk', function testUnicodeInStringOk() {
    var code =
      '<script> var x = 42; </script>' +
      '<script> x = \'te\ufeffst\'; </script>' + // should run
      '<script> record(x); </script>';
    var xValue = 0;
    var div = createDiv();
    caja.load(div, xhrUriPolicy, jsunitCallback(function(frame) {
      frame.code('http://example.com/', 'text/html', code)
           .api({
             record: frame.tame(frame.markFunction(function(x) {
               xValue = x;
             }))
           })
           .run(jsunitCallback(function(result) {
             assertEquals('te\ufeffst', xValue);
             jsunitPass('testUnicodeInStringOk');
           }));
    }));
  });

  jsunitRegister('testBuilderApiJsNoDom', function testBuilderApiJsNoDom() {
    caja.load(undefined, uriPolicy, function (frame) {
      var extraImports = { x: 4, y: 3 };
      frame.code('fixture-guest.js', 'text/javascript')
           .api(extraImports)
           .run(function(result) {
             assertGuestJsCorrect(frame, undefined, result);
             jsunitPass('testBuilderApiJsNoDom');
           });
    });
  });

  jsunitRegister('testBuilderApiNetUndefined', 
      function testBuilderApiNetUndefined() {
    var div = createDiv();
    caja.load(div, undefined, function (frame) {
      frame.code(
          location.protocol + '//' + location.host + '/',
          'text/html',
          '<a href="http://fake1.url/foo">fake1</a>' + 
          '<a href="http://fake2.url/foo">fake2</a>'
          )
        .run(function (result) {
          assertStringDoesNotContain('http://fake1.url/foo', div.innerHTML);
          assertStringDoesNotContain('http://fake2.url/foo', div.innerHTML);
          jsunitPass('testBuilderApiNetUndefined');
        });
    });
  });

  var urlSrcAndXHRTestCase =
      '<a href="http://fake1.url/foo">fake1</a>' +
      '<a href="http://fake2.url/foo">fake2</a>' +
      // script should not stall execution, just not load.
      '<script src="http://bogus.invalid/foo.js"></script>' +
      // xhr should indicate error response
      '<script>' +
      'r("init");' +
      'var xhr = new XMLHttpRequest();' +
      'try {' +
      '  xhr.open("GET", "' + location.protocol + '//' + location.host +
          '/nonexistent", false);' +  // Note sync XHR so test can be sync.
      '} catch (e) { r("" + e); }' +
      'xhr.onreadystatechange = function() {' +
      '  r(xhr.readyState + " " + xhr.status);' +
      '};' +
      'xhr.send();' +
      '</script>';
  
  jsunitRegister('testBuilderApiNetNone', function testBuilderApiNetNone() {
    var div = createDiv();
    caja.load(div, caja.policy.net.NO_NETWORK, jsunitCallback(function(frame) {
      var xhrRes = [];
      frame.code(
          location.protocol + '//' + location.host + '/',
          'text/html',
          urlSrcAndXHRTestCase)
        .api({r: frame.tame(frame.markFunction(
            function(val) { xhrRes.push(val); }))})
        .run(jsunitCallback(function(result) {
          assertStringDoesNotContain('http://fake1.url/foo', div.innerHTML);
          assertStringDoesNotContain('http://fake2.url/foo', div.innerHTML);
          // we don't actually care that this is specifically the error, but
          // we want to make sure we do get a specific error and not a lost
          // signal
          assertEquals('init,URI violates security policy', String(xhrRes));
          jsunitPass('testBuilderApiNetNone');
        }));
    }));
  });

  jsunitRegister('testBuilderApiNetNoFetch', function testBuilderApiNetNone() {
    var div = createDiv();
    caja.load(
        div,
        { rewrite: caja.policy.net.ALL.rewrite /* but no 'fetch' */ },
        jsunitCallback(function(frame) {
      var xhrRes = [];
      frame.code(
          location.protocol + '//' + location.host + '/',
          'text/html',
          urlSrcAndXHRTestCase)
        .api({r: frame.tame(frame.markFunction(
            function(val) { xhrRes.push(val); }))})
        .run(jsunitCallback(function(result) {
          assertStringContains('http://fake1.url/foo', div.innerHTML);
          assertStringContains('http://fake2.url/foo', div.innerHTML);
          // TODO(kpreid): verify script did not load, as expected
          // XHR is independent of fetcher
          assertEquals('init,4 404', String(xhrRes).substr(0, 13));
          jsunitPass('testBuilderApiNetNoFetch');
        }));
    }));
  });

  jsunitRegister('testBuilderApiNetAll', function testBuilderApiNetAll() {
    var div = createDiv();
    caja.load(div, caja.policy.net.ALL, function (frame) {
      frame.code(
          location.protocol + '//' + location.host + '/',
          'text/html',
          '<a href="http://fake1.url/foo">fake1</a>' + 
          '<a href="http://fake2.url/foo">fake2</a>'
          )
        .run(function (result) {
          assertStringContains('http://fake1.url/foo', div.innerHTML);
          assertStringContains('http://fake2.url/foo', div.innerHTML);
          jsunitPass('testBuilderApiNetAll');
        });
    });
  });

  jsunitRegister('testBuilderApiNetHost', function testBuilderApiNetHost() {
    var div = createDiv();
    caja.load(div,
        caja.policy.net.only("http://fake1.url/foo"), function (frame) {
      frame.code(
          location.protocol + '//' + location.host + '/',
          'text/html',
          '<a href="http://fake1.url/foo">fake1</a>' + 
          '<a href="http://fake2.url/foo">fake2</a>' 
          )
        .run(function (result) {
          assertStringContains('http://fake1.url/foo', div.innerHTML);
          assertStringDoesNotContain('http://fake2.url/foo', div.innerHTML);
          jsunitPass('testBuilderApiNetHost');
        });
    });
  });

  jsunitRegister('testBuilderApiContentHtml',
      function testBuilderApiContentHtml() {
    var div = createDiv();
    caja.load(div, uriPolicy, function (frame) {
        fetch('fixture-guest.html', function(resp) {
          frame.code(
              location.protocol + '//' + location.host + '/',
              'text/html', resp)
            .run(function (result) {
              assertGuestHtmlCorrect(frame, div);
              jsunitPass('testBuilderApiContentHtml');
            });
        });
    });
  });

  jsunitRegister('testBuilderApiContentJs', function testBuilderApiContentJs() {
    caja.load(undefined, uriPolicy, function (frame) {
      var extraImports = { x: 4, y: 3 };
      fetch('fixture-guest.js', function(resp) {
        frame.code(
              location.protocol + '//' + location.host + '/',
              'application/javascript', resp)
             .api(extraImports)
             .run(function (result) {
               assertGuestJsCorrect(frame, undefined, result);
               jsunitPass('testBuilderApiContentJs');
             });
      });
    });
  });

  caja.makeFrameGroup(basicCajaConfig, function (frameGroup) {

    jsunitRegister('testContentHtml', function testContentHtml() {
      fetch('fixture-guest.html', function(resp) {
        var div = createDiv();
        frameGroup.makeES5Frame(div, uriPolicy, function (frame) {
          frame.content(location.protocol + '//' + location.host + '/',
                        resp, 'text/html')
              .run({}, function (result) {
            assertGuestHtmlCorrect(frame, div);
            jsunitPass('testContentHtml');
          });
        });
      });
    });

    jsunitRegister('testContentJs', function testContentJs() {
      fetch('fixture-guest.js', function(resp) {
        frameGroup.makeES5Frame(undefined, uriPolicy, function (frame) {
          var extraImports = { x: 4, y: 3 };
          frame.content(location.protocol + '//' + location.host + '/',
                        resp, 'application/javascript')
              .run(extraImports, function (result) {
            assertGuestJsCorrect(frame, undefined, result);
            jsunitPass('testContentJs');
          });
        });
      });
    });

    jsunitRegister('testUrlHtml', function testUrlHtml() {
      var div = createDiv();
      frameGroup.makeES5Frame(div, uriPolicy, function (frame) {
        frame.url('fixture-guest.html').run({}, function (result) {
          assertGuestHtmlCorrect(frame, div);
          jsunitPass('testUrlHtml');
        });
      });
    });
    
    jsunitRegister('testUrlJs', function testUrlJs() {
      frameGroup.makeES5Frame(undefined, uriPolicy, function (frame) {
        var extraImports = { x: 4, y: 3 };
        frame.url('fixture-guest.js').run(extraImports, function (result) {
          assertGuestJsCorrect(frame, undefined, result);
          jsunitPass('testUrlJs');
        });
      });
    });

    jsunitRegister('testUrlJsWithDiv', function testUrlJsWithDiv() {
      var div = createDiv();
      frameGroup.makeES5Frame(div, uriPolicy, function (frame) {
        var extraImports = { x: 4, y: 3 };
        frame.url('fixture-guest.js').run(extraImports, function (result) {
          assertEmptyGuestHtmlCorrect(frame, div);
          assertGuestJsCorrect(frame, undefined, result);
          jsunitPass('testUrlJsWithDiv');
        });
      });
    });

    jsunitRegister('testUrlHtmlWithMimeType',
        function testUrlHtmlWithMimeType() {
      var div = createDiv();
      frameGroup.makeES5Frame(div, uriPolicy, function (frame) {
        frame.url('fixture-guest.html', 'text/html').run({},
            function (result) {
          assertGuestHtmlCorrect(frame, div);
          jsunitPass('testUrlHtmlWithMimeType');
        });
      });
    });

    jsunitRegister('testContainerIsIframe', function testContainerIsIframe() {
      var container = document.createElement('iframe');
      document.body.appendChild(container);
      // TODO(felix8a): this feels unnecessarily fragile
      // firefox needs at least two setTimeouts before the iframe is ready
      setTimeout(function() {
        setTimeout(function() {
          var frameDoc = container.contentDocument;
          frameDoc.removeChild(frameDoc.documentElement);
          frameGroup.makeES5Frame(frameDoc, uriPolicy,
            function(frame) {
              frame.url('fixture-guest.html', 'text/html').run({},
                function (result) {
                  // TODO(kpreid): Ensure no container
                  assertGuestHtmlCorrect(
                    frame, frameDoc.documentElement, frameDoc);
                  jsunitPass('testContainerIsIframe');
                });
            });
        }, 0);
      }, 0);
    });

    jsunitRegister('testImplQuestions', function testImplQuestions() {
      // Wait for default frame group because we're using it via caja.*.
      caja.whenReady(function testImplQuestions_inner() {
        assertEquals('isES53', false, frameGroup.isES53());
        assertEquals('isES53', false, caja.isES53());
        assertEquals('isSES', true, frameGroup.isSES());
        assertEquals('isSES', true, caja.isSES());
        jsunitPass('testImplQuestions');
      });
    });

    readyToTest();
    jsunitRun();
  });
})();
