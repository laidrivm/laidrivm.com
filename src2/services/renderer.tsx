import {ok} from '../utils.ts'
import type {ServiceResponse, FileCollection} from '../types.ts'

let wasPrintedOnce = false

// Experiments here
// Types for our component system
interface InteractiveComponent {
  type: string;
  selector: string;
  handler?: string;
  props?: Record<string, any>;
}

interface RenderContext {
  components: Map<string, InteractiveComponent>;
  usedHandlers: Set<string>;
}

// Global render context
let currentContext: RenderContext | null = null;

// Helper to create a new render context
export function createRenderContext(): RenderContext {
  return {
    components: new Map(),
    usedHandlers: new Set()
  };
}

// Main render function
export async function renderPage() {

    // Generate client runtime
    const clientJs = await generateClientRuntime(context);

    // Read CSS from file
    const css = await readFile(cssPath, 'utf-8');

    // Ensure output directories exist
    const fullPath = join(outputDir, filename);
    await mkdir(dirname(fullPath), { recursive: true });

    // Write files
    await writeFile(fullPath, html);
    await writeFile(join(outputDir, 'interactive.js'), clientJs);
    await writeFile(join(outputDir, 'styles.css'), css);

    console.log(`✓ Rendered ${filename}`);
    console.log(`✓ Generated interactive.js with ${context.usedHandlers.size} component types`);
    console.log(`✓ Copied styles.css`);
}

//TODO: Convert sourcePath into filename, i.e. index.html or ru/free-durov.html
async function renderJSX(Content: JSX.Element, sourcePath: string): JSX.Element {
  const publicDir = process.env.PUBLIC_DIR //instead of outputDir
  const outputPath = getOutputName(sourcePath) //instead of filename

  // Create render context
  const context = createRenderContext();
  currentContext = context;

  const page = (
    <PageTemplate 
      title="My First Blog Post" 
      description="Learn about building SSGs with Bun and ElysiaJS"
    >
      <Content />
    </PageTemplate>
  )
  let html: string = ''

  try {
    html = Html.renderToString(page) // problem here as KitaJS might not have such a function
  } finally {
    currentContext = null
  }

  return html
}

// End of Experiments
export function renderTemplate(
  converterContent: ServiceResponse<FileCollection>
): Promise<ServiceResponse<FileCollection>> {
  if (!converterContent.success) {
    return converterContent
  }
  if (converterContent.data.mode === 'skip') {
    console.log(`Skipping rendering JSX into HTML`)
    return ok({
      mode: 'skip'
    })
  }
  const files = converterContent.data.files
  const processedFiles = []
  for (const file of files) {
    if (file.type === 'jsx') {
      console.log(`Trying to render JSX from ${file.localPath} into HTML`)
      const htmlContent = await renderJSX(file.content, file.sourcePath)
      processedFiles.push({
        ...file,
        content: htmlContent,
        type: 'html'
      })
      if (!wasPrintedOnce) {
        wasPrintedOnce = true
        console.log(htmlContent)
      }
    } else {
      processedFiles.push(file)
    }
  }

  return ok({
    ...converterContent.data,
    files: processedFiles
  })
}







// renderer.ts - SSG renderer aligned with ElysiaJS and KitaJS
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import crypto from 'node:crypto';

// Since ElysiaJS already uses KitaJS internally, we can leverage that
// For the TS plugin, add to tsconfig.json:
// {
//   "compilerOptions": {
//     "jsx": "react",
//     "jsxFactory": "Html.createElement",
//     "jsxFragmentFactory": "Html.Fragment",
//     "plugins": [{ "name": "@kitajs/ts-html-plugin" }]
//   }
// }

// Helper to extract function body as string
function extractFunctionBody(fn: Function): string {
  const fnStr = fn.toString();
  const match = fnStr.match(/\{([\s\S]*)\}$/);
  return match ? match[1].trim() : '';
}

// Helper to create event handler registration
function createHandlerRegistration(
  componentId: string,
  eventType: string,
  handler: Function
): string {
  const handlerName = `handler_${componentId}_${eventType}`;
  const handlerBody = extractFunctionBody(handler);
  
  return `
    window.__handlers = window.__handlers || {};
    window.__handlers['${handlerName}'] = function(event) {
      const element = event.currentTarget;
      ${handlerBody}
    };
  `;
}

// Enhanced island helper that captures event handlers
export function island<T extends JSX.Element>(
  element: T,
  type: string,
  handlers?: Record<string, Function>,
  props?: Record<string, any>
): T {
  if (!currentContext) {
    throw new Error('island() must be called within a render context');
  }

  const id = crypto.randomBytes(8).toString('hex');
  const componentHandlers: string[] = [];

  // Process event handlers
  if (handlers) {
    Object.entries(handlers).forEach(([eventType, handler]) => {
      const handlerCode = createHandlerRegistration(id, eventType, handler);
      componentHandlers.push(handlerCode);
      
      // Add data attribute for event binding
      if (typeof element === 'object' && element && 'props' in element) {
        element.props = {
          ...element.props,
          [`data-${eventType}`]: `handler_${id}_${eventType}`
        };
      }
    });
  }

  // Register component
  currentContext.components.set(id, {
    type,
    selector: `[data-island="${id}"]`,
    handler: componentHandlers.join('\n'),
    props
  });
  
  currentContext.usedHandlers.add(type);

  // Add data attributes
  if (typeof element === 'object' && element && 'props' in element) {
    element.props = {
      ...element.props,
      'data-island': id,
      'data-island-type': type,
      ...(props ? { [`data-${type}-props`]: JSON.stringify(props) } : {})
    };
  }

  return element;
}

// Component handlers in separate files
// interactive/image-zoom.ts
export const imageZoomHandler = `
export function setupImageZoom(element) {
  element.addEventListener('click', function() {
    if (this.classList.contains('zoomed')) {
      this.classList.remove('zoomed');
      removeOverlay();
    } else {
      this.classList.add('zoomed');
      createOverlay(() => {
        this.classList.remove('zoomed');
      });
    }
  });
}

function createOverlay(onClose) {
  const overlay = document.createElement('div');
  overlay.className = 'image-overlay';
  document.body.appendChild(overlay);
  
  overlay.addEventListener('click', () => {
    onClose();
    removeOverlay();
  });
  
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      onClose();
      removeOverlay();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
}

function removeOverlay() {
  const overlay = document.querySelector('.image-overlay');
  if (overlay) overlay.remove();
}
`;

// interactive/copy-button.ts
export const copyButtonHandler = `
export async function setupCopyButton(element) {
  element.addEventListener('click', async function(e) {
    e.preventDefault();
    const codeBlock = this.closest('.code-block');
    const code = codeBlock.querySelector('code').textContent;
    
    try {
      await navigator.clipboard.writeText(code);
      this.classList.add('copied');
      this.setAttribute('aria-label', 'Copied!');
      
      setTimeout(() => {
        this.classList.remove('copied');
        this.setAttribute('aria-label', 'Copy code');
      }, 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = code;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  });
}
`;

// interactive/anchor-link.ts
export const anchorLinkHandler = `
export function setupAnchorLink(element) {
  element.addEventListener('click', function(e) {
    e.preventDefault();
    const targetId = this.getAttribute('href').slice(1);
    const target = document.getElementById(targetId);
    
    if (target) {
      const offset = 80; // Header height
      const targetPosition = target.getBoundingClientRect().top + window.scrollY - offset;
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
      
      // Update URL without triggering scroll
      history.pushState(null, null, '#' + targetId);
    }
  });
}
`;

// Map of component types to their handlers
const componentHandlers = new Map([
  ['image-zoom', imageZoomHandler],
  ['copy-button', copyButtonHandler],
  ['anchor-link', anchorLinkHandler]
]);

// Sample Components

// Static component - no JavaScript needed
export function Card({ title, content }: { title: string; content: string }) {
  return (
    <div class="card">
      <h3 class="card-title">{title}</h3>
      <div class="card-content">{content}</div>
    </div>
  );
}

// Interactive image component with inline handler
export function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  // Define the click handler inline
  const handleClick = () => {
    // This will be extracted and included in the client bundle
    const img = element as HTMLImageElement;
    if (img.classList.contains('zoomed')) {
      img.classList.remove('zoomed');
      document.querySelector('.image-overlay')?.remove();
    } else {
      img.classList.add('zoomed');
      const overlay = document.createElement('div');
      overlay.className = 'image-overlay';
      overlay.onclick = () => {
        img.classList.remove('zoomed');
        overlay.remove();
      };
      document.body.appendChild(overlay);
    }
  };

  return island(
    <img 
      src={src} 
      alt={alt} 
      class="zoomable-image"
      loading="lazy"
    />,
    'image-zoom',
    { click: handleClick }
  );
}

// Interactive code block
export function CodeBlock({ code, language }: { code: string; language: string }) {
  const handleCopy = async () => {
    const button = element as HTMLButtonElement;
    const codeBlock = button.closest('.code-block');
    const codeText = codeBlock?.querySelector('code')?.textContent || '';
    
    try {
      await navigator.clipboard.writeText(codeText);
      button.classList.add('copied');
      setTimeout(() => button.classList.remove('copied'), 2000);
    } catch {
      console.error('Failed to copy');
    }
  };

  return (
    <div class="code-block">
      <div class="code-header">
        <span class="code-language">{language}</span>
        {island(
          <button class="copy-btn" aria-label="Copy code">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.242a2 2 0 00-.602-1.43L16.083 2.57A2 2 0 0014.685 2H10a2 2 0 00-2 2z" />
              <path d="M14 2v4a2 2 0 002 2h4" />
              <path d="M4 8v10a2 2 0 002 2h8" />
            </svg>
          </button>,
          'copy-button',
          { click: handleCopy },
          { code }
        )}
      </div>
      <pre><code class={`language-${language}`}>{code}</code></pre>
    </div>
  );
}

export function Layout(props: Html.PropsWithChildren<{ head: string; title?: string }>) {
  return (
    <>
      {'<!doctype html>'}
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>{props.title || 'Hello World!'}</title>
          {props.head}
        </head>
        <body>{props.children}</body>
      </html>
    </>
  );
}

const html = (
  <Layout
    head={
      <>
        <link rel="stylesheet" href="/style.css" />
        <script src="/script.js" />
      </>
    }
  >
    <div>Hello World</div>
  </Layout>
);

// Page template
export function PageTemplate({ 
  title, 
  description, 
  children 
}: { 
  title: string; 
  description: string; 
  children: JSX.Element | JSX.Element[];
}) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content={description} />
        <title>{title}</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <header class="site-header">
          <nav>
            <a href="/" class="site-title">My SSG Site</a>
            <ul class="nav-links">
              <li><a href="/blog">Blog</a></li>
              <li><a href="/about">About</a></li>
            </ul>
          </nav>
        </header>
        
        <main class="content">
          {children}
        </main>
        
        <footer class="site-footer">
          <p>&copy; 2024 My SSG Site. Built with Bun and ElysiaJS.</p>
        </footer>
        
        <script src="/interactive.js" defer></script>
      </body>
    </html>
  );
}

// Client runtime generator
async function generateClientRuntime(context: RenderContext): Promise<string> {
  const componentScripts: string[] = [];
  const inlineHandlers: string[] = [];

  // Collect all component handlers
  for (const [id, component] of context.components) {
    if (component.handler) {
      inlineHandlers.push(component.handler);
    }
  }

  // Include handlers for used component types from files
  for (const type of context.usedHandlers) {
    const handler = componentHandlers.get(type);
    if (handler) {
      componentScripts.push(handler);
    }
  }

  return `
// Auto-generated client runtime
(function() {
  'use strict';
  
  // Component handlers from files
  ${componentScripts.join('\n\n')}
  
  // Inline event handlers
  ${inlineHandlers.join('\n')}
  
  // Runtime initialization
  function initializeIslands() {
    // Initialize components by type
    document.querySelectorAll('[data-island-type="image-zoom"]').forEach(el => {
      if (typeof setupImageZoom === 'function') setupImageZoom(el);
    });
    
    document.querySelectorAll('[data-island-type="copy-button"]').forEach(el => {
      if (typeof setupCopyButton === 'function') setupCopyButton(el);
    });
    
    document.querySelectorAll('[data-island-type="anchor-link"]').forEach(el => {
      if (typeof setupAnchorLink === 'function') setupAnchorLink(el);
    });
    
    // Bind inline handlers
    document.querySelectorAll('[data-click]').forEach(el => {
      const handlerName = el.getAttribute('data-click');
      if (window.__handlers && window.__handlers[handlerName]) {
        el.addEventListener('click', window.__handlers[handlerName]);
      }
    });
    
    // Handle initial hash
    if (window.location.hash) {
      const target = document.querySelector(window.location.hash);
      if (target) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeIslands);
  } else {
    initializeIslands();
  }
})();
`;
}
