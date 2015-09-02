// Copyright (C) 2012 Google Inc.
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

package com.google.caja.util;

import java.net.InetSocketAddress;

import javax.servlet.http.HttpServletResponse;

import org.eclipse.jetty.server.Connector;
import org.eclipse.jetty.server.handler.ContextHandler;
import org.eclipse.jetty.server.handler.DefaultHandler;
import org.eclipse.jetty.server.handler.HandlerList;
import org.eclipse.jetty.server.handler.ResourceHandler;
import org.eclipse.jetty.server.Handler;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;
import org.eclipse.jetty.util.resource.Resource;

import com.google.caja.SomethingWidgyHappenedError;
import com.google.caja.service.ProxyServlet;

/**
 * Encapsulates the management of a localhost Web server running on an
 * arbitrary port, serving up the Caja resources and servlets, for testing.
 */
public class LocalServer {
  private final ConfigureContextCallback contextCallback;
  private Server server;

  public interface ConfigureContextCallback {
    void configureContext(ServletContextHandler ctx);
  }

  public LocalServer(ConfigureContextCallback contextCallback) {
    this.contextCallback = contextCallback;
  }

  public int getPort() {
    int port = server.getConnectors()[0].getLocalPort();
    // Occasionally port is -1 after the server is started, not sure why yet.
    if (port < 0) {
      System.err.println("port=" + port);
      throw new SomethingWidgyHappenedError("port=" + port);
    }
    return port;
  }

  /**
   * Start a local web server listening at the given TCP port.  port==0 will
   * choose an arbitrary unused port.
   */
  public void start(String host, int port) throws Exception {
    server = new Server(new InetSocketAddress(host, port));

    // Increase header buffer size to allow long URLs (particularly for
    // generic-host-page.html which puts the content into the URL).
    // (The Server(int) constructor adds one connector internally.)
    server.getConnectors()[0].setRequestHeaderSize(100 * 1024);

    final ResourceHandler cajaStatic = new ResourceHandler();
    cajaStatic.setResourceBase("./ant-war/");

    // static file serving for tests
    final ResourceHandler resource_handler = new ResourceHandler() {
      @Override
      protected void doResponseHeaders(HttpServletResponse response,
          Resource resource, String mimeType) {
        super.doResponseHeaders(response, resource, mimeType);

        // If not disabled, IE and Chrome will refuse to execute script text
        // which happens to occur in the URL (which applies to our
        // generic-host-page for one).
        response.setHeader("X-XSS-Protection", "0");
      }
    };
    resource_handler.setResourceBase(".");
    resource_handler.getMimeTypes().addMimeMapping(
        "ujs", "text/javascript;charset=utf-8");

    // caja (=playground for now) server under /caja directory
    final String subdir = "/caja";
    final ContextHandler caja = new ContextHandler(subdir);
    {
      final String service = "/proxy";

      // fetching proxy service -- Servlet setup code gotten from
      // <http://docs.codehaus.org/display/JETTY/Embedding+Jetty> @ 2010-06-30 &
      // <http://wiki.eclipse.org/Jetty/Tutorial/Embedding_Jetty> @ 2015-07-27
      ServletContextHandler servlets = new ServletContextHandler(
        server, "/", ServletContextHandler.NO_SESSIONS);
      servlets.addServlet(new ServletHolder(new ProxyServlet()), service);

      // Hook for subclass to add more servlets
      if (contextCallback != null) {
        contextCallback.configureContext(servlets);
      }

      final HandlerList handlers = new HandlerList();
      handlers.setHandlers(new Handler[]{
          cajaStatic,
          servlets,
          new DefaultHandler()});
      caja.setHandler(handlers);
    }

    final HandlerList handlers = new HandlerList();
    handlers.setHandlers(new Handler[] {
        resource_handler,
        caja,
        new DefaultHandler()});
    server.setHandler(handlers);

    server.start();
  }

  /**
   * Stop the local web server
   */
  public void stop() throws Exception {
    // In case of exceptions, the server will be turned down when the test exits
    server.stop();
  }
}
