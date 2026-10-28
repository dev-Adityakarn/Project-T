import "@/App.css";
import { Suspense, lazy, useEffect, useLayoutEffect } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieConsent } from "@/components/CookieConsent";
import { AppSeo } from "@/components/AppSeo";
import { AdSenseBootstrap } from "@/components/ads/AdSenseBootstrap";
import { loadAnalytics, trackPageview } from "@/lib/analytics";
import { clearStaleOwnedJsonLd } from "@/seo/jsonld-dom";
import Home from "@/pages/Home";

const Games = lazy(() => import("@/pages/Games"));
const GamePlay = lazy(() => import("@/pages/GamePlay"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Daily = lazy(() => import("@/pages/Daily"));
const AuthPage = lazy(() => import("@/pages/AuthPage"));
const ContentPage = lazy(() => import("@/pages/ContentPage"));
const Lessons = lazy(() => import("@/pages/Lessons"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogPost = lazy(() => import("@/pages/BlogPost"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const AdminApp = lazy(() => import("@/pages/admin/AdminApp"));

const CONTENT_ROUTES = [
  "/typing-test",
  "/typing-test/1-minute",
  "/typing-test/3-minute",
  "/typing-test/5-minute",
  "/typing-test/numbers",
  "/typing-test/punctuation",
  "/typing-test/code",
  "/typing-practice",
  "/typing-practice/beginners",
  "/hindi-typing-test",
  "/government-exam-typing-test",
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms",
];

const REDIRECTS = {
  "/typing-speed-test": "/typing-test/",
  "/typing-speed-test/": "/typing-test/",
  "/test": "/typing-test/",
  "/test/": "/typing-test/",
  "/practice": "/typing-practice/",
  "/practice/": "/typing-practice/",
  "/lessons": "/typing-lessons/",
  "/lessons/": "/typing-lessons/",
  "/typing-tutor": "/typing-lessons/",
  "/typing-tutor/": "/typing-lessons/",
  "/typing-test/60-seconds": "/typing-test/1-minute/",
  "/typing-test/60-seconds/": "/typing-test/1-minute/",
  "/privacy": "/privacy-policy/",
  "/privacy/": "/privacy-policy/",
  "/terms-of-service": "/terms/",
  "/terms-of-service/": "/terms/",
  "/hindi-typing": "/hindi-typing-test/",
  "/hindi-typing/": "/hindi-typing-test/",
  "/blog/index": "/blog/",
  "/blog/index/": "/blog/",
};

const Fallback = () => <div className="p-24 text-center text-sm text-muted-foreground" data-testid="route-loading">Loading…</div>;

const TrailingSlashHandler = () => {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (
      pathname.length > 1 &&
      !pathname.endsWith("/") &&
      !pathname.includes(".") &&
      !pathname.startsWith("/api") &&
      !pathname.startsWith("/admin") &&
      pathname !== "/404"
    ) {
      navigate(`${pathname}/${search}${hash}`, { replace: true });
    }
  }, [pathname, search, hash, navigate]);

  return null;
};

const RouteEffects = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    if (!pathname.startsWith("/admin")) trackPageview(pathname, document.title);
  }, [pathname]);
  return null;
};

/**
 * Drop route-scoped JSON-LD belonging to the previous pathname immediately.
 * This also covers destinations whose article metadata is still loading and
 * therefore have not rendered their <Seo> component yet.
 */
const SchemaRouteGuard = () => {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    clearStaleOwnedJsonLd(pathname);
  }, [pathname]);
  return null;
};

const SiteChrome = ({ children }) => {
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin")) return children;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>{children}</main>
      <SiteFooter />
      <CookieConsent />
    </div>
  );
};

function AppShell() {
  return (
    <AuthProvider>
      <TrailingSlashHandler />
      <RouteEffects />
      <SchemaRouteGuard />
      <AppSeo />
      <AdSenseBootstrap />
      <SiteChrome>
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            {CONTENT_ROUTES.flatMap((p) => [
              <Route key={p} path={p} element={<ContentPage path={p} />} />,
              <Route key={`${p}/`} path={`${p}/`} element={<ContentPage path={p} />} />,
            ])}
            <Route path="/typing-lessons" element={<Lessons />} />
            <Route path="/typing-lessons/" element={<Lessons />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/blog/:slug/" element={<BlogPost />} />
            <Route path="/games" element={<Games />} />
            <Route path="/games/" element={<Games />} />
            <Route path="/games/:id" element={<GamePlay />} />
            <Route path="/games/:id/" element={<GamePlay />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/leaderboard/" element={<Leaderboard />} />
            <Route path="/daily" element={<Daily />} />
            <Route path="/daily/" element={<Daily />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/" element={<Dashboard />} />
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/login/" element={<AuthPage mode="login" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
            <Route path="/register/" element={<AuthPage mode="register" />} />
            <Route path="/admin/*" element={<AdminApp />} />
            {Object.entries(REDIRECTS).map(([from, to]) => (
              <Route key={from} path={from} element={<Navigate to={to} replace />} />
            ))}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </SiteChrome>
    </AuthProvider>
  );
}

const router = createBrowserRouter([{ path: "*", element: <AppShell /> }]);

function App() {
  useEffect(() => { loadAnalytics(); }, []);

  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

export default App;
