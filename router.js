let paramRe = /^:(.+)/;
function segmentize(uri) {
    return uri.replace(/(^\/+|\/+$)/g, "").split("/");
}
function match(routes, uri) {
    let match;
    const [uriPathname] = uri.split("?");
    const uriSegments = segmentize(uriPathname);
    const isRootUri = uriSegments[0] === "/";

    for (let i = 0; i < routes.length; i++) {
        const route = routes[i];
        const routeSegments = segmentize(route.path);
        const max = Math.max(uriSegments.length, routeSegments.length);
        let index = 0;
        let missed = false;
        let params = {};
        for (; index < max; index++) {
            const uriSegment = uriSegments[index];
            const routeSegment = routeSegments[index];
            const fallback = routeSegment === "*";
            if (fallback) {
                params["*"] = uriSegments
                    .slice(index)
                    .map(decodeURIComponent)
                    .join("/");
                break;
            }
            if (uriSegment === undefined) {
                missed = true;
                break;
            }
            let dynamicMatch = paramRe.exec(routeSegment);
            if (dynamicMatch && !isRootUri) {
                let value = decodeURIComponent(uriSegment);
                params[dynamicMatch[1]] = value;
            } else if (routeSegment !== uriSegment) {
                missed = true;
                break;
            }
        }
        if (!missed) {
            match = { params, ...route };
            break;
        }
    }

    return match || null;
}

export default class Router extends HTMLElement {
    connectedCallback() {
        this.updateLinks();
        this.navigate(window.location.pathname);
    }
    get routes() {
        return Array.from(this.querySelectorAll("wc-route"))
            .filter((node) => node.parentNode === this)
            .map((r) => ({
                path: r.getAttribute("path"),
                title: r.getAttribute("title"),
                component: r.getAttribute("component"),
            }));
    }
    get outlet() {
        return this.querySelector("wc-outlet");
    }
    updateLinks() {
        this.querySelectorAll("a[route]").forEach((link) => {
            const target = link.getAttribute("route");
            link.setAttribute("href", target);
            link.onclick = (e) => {
                e.preventDefault();
                this.navigate(target);
            };
        });
    }
    navigate(url) {
        /* history.pushState(state, title, url); */
        const matchedRoute = match(this.routes, url);

        if (matchedRoute !== null) {
            this.activeRoute = matchedRoute;
            window.history.pushState(null, null, null);

            // update the DOM
            this.update();
        }
    }

    update() {
        const { component, title, params = {} } = this.activeRoute;
        if (component) {
            while (this.outlet.firstChild) {
                this.outlet.removeChild(this.outlet.firstChild);
            }
        }

        const view = document.createElement(component);
        // if the route has title attribute value
        // update the document title with title attribute value
        document.title = title || document.title;

        // pass the dynamic paramaters as attribute
        // for newly created element

        for (let key in params) {
            if (key !== "*") view.setAttribute(key, params[key]);
        }
        this.outlet.appendChild(view);
    }
}

export class Home extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `<div class="page">
        <h1>Home Page</h1>
      </div>`;
    }
}

customElements.define("wc-router", Router);

customElements.define("wc-home", Home);
