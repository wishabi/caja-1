// Copyright (C) 2008 Google Inc.
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

package com.google.caja.service;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.eclipse.jetty.server.Request;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.handler.AbstractHandler;

import java.io.IOException;

/**
 * A executable for the proxy service.
 *
 * @author jasvir@gmail.com (Jasvir Nagra)
 */
public class ProxyServletMain {
  public static void main(String[] args) throws Exception {
    // http://docs.codehaus.org/display/JETTY/Embedding+Jetty
    int port = 8887;
    Server server = new Server(port);

    final ProxyServlet servlet = new ProxyServlet();

    server.setHandler(new AbstractHandler() {
      public void handle(
          String target, Request baseRequest, HttpServletRequest req,
          HttpServletResponse resp)
          throws ServletException {
        try {
          servlet.service(req, resp);
        } catch (IOException e) {
          throw (ServletException) new ServletException().initCause(e);
        }
      }
    });
    server.start();
  }
}

