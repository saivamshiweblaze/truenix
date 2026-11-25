-- TRUEVIX Phase 2 — reference data required by the application (not demo data).
--   * Operator roles and their default permission matrix (mirrors defaultRolePermissions() in the admin portal).
--   * Initial public site copy managed in the CMS.

insert into public.admin_roles (id, label, description, position) values
  ('super_admin', 'Super administrator', 'Complete access, including administrator accounts and permissions.', 1),
  ('platform_admin', 'Platform administrator', 'Broad management of members, content and programmes.', 2),
  ('user_manager', 'User manager', 'Members, accounts and onboarding.', 3),
  ('content_manager', 'Content manager', 'Public site content, announcements and community posts.', 4),
  ('opportunity_manager', 'Opportunity manager', 'Opportunities, hackathons and applications.', 5),
  ('institution_manager', 'Institution manager', 'Institutions and organisations.', 6),
  ('moderator', 'Community moderator', 'Reports and moderation decisions.', 7),
  ('analyst', 'Analyst', 'Read-only analytics and reports.', 8)
on conflict (id) do nothing;

with modules(m) as (
  values ('overview'), ('users'), ('onboarding'), ('ideas'), ('content'), ('moderation'), ('research'), ('validation'), ('opportunities'),
         ('institutions'), ('talent'), ('studies'), ('collaboration'), ('communications'), ('cms'), ('analytics'), ('access'), ('audit'), ('settings')
),
perms(p) as (
  values ('view'), ('create'), ('edit'), ('approve'), ('publish'), ('suspend'), ('archive'), ('delete'), ('export'), ('manage_permissions')
),
grants(role_id, module, permission) as (
  -- super_admin: everything
  select 'super_admin', m, p from modules, perms
  union all
  -- platform_admin: manage + delete everywhere except access (view only)
  select 'platform_admin', m, p from modules, perms where m <> 'access' and p <> 'manage_permissions'
  union all select 'platform_admin', 'access', 'view'
  union all
  -- user_manager
  select 'user_manager', m, 'view' from (values ('overview'), ('audit')) x(m)
  union all select 'user_manager', m, p from (values ('users'), ('onboarding')) x(m), (values ('view'), ('create'), ('edit'), ('approve'), ('suspend'), ('archive'), ('export')) y(p)
  union all
  -- content_manager
  select 'content_manager', 'overview', 'view'
  union all select 'content_manager', m, p from (values ('cms'), ('communications'), ('content'), ('ideas')) x(m), (values ('view'), ('create'), ('edit'), ('approve'), ('publish'), ('archive'), ('export')) y(p)
  union all
  -- opportunity_manager
  select 'opportunity_manager', 'overview', 'view'
  union all select 'opportunity_manager', m, p from (values ('opportunities'), ('studies')) x(m), (values ('view'), ('create'), ('edit'), ('approve'), ('publish'), ('archive'), ('export')) y(p)
  union all select 'opportunity_manager', 'institutions', 'view'
  union all
  -- institution_manager
  select 'institution_manager', 'overview', 'view'
  union all select 'institution_manager', m, p from (values ('institutions'), ('talent'), ('collaboration')) x(m), (values ('view'), ('create'), ('edit'), ('approve'), ('archive'), ('export')) y(p)
  union all
  -- moderator
  select 'moderator', m, 'view' from (values ('overview'), ('ideas'), ('users')) x(m)
  union all select 'moderator', m, p from (values ('moderation'), ('content'), ('collaboration')) x(m), (values ('view'), ('edit'), ('approve'), ('suspend'), ('archive')) y(p)
  union all
  -- analyst: view everything except access and settings; export analytics
  select 'analyst', m, 'view' from modules where m not in ('access', 'settings')
  union all select 'analyst', 'analytics', 'export'
)
insert into public.admin_permissions (admin_role_id, module, permission)
select distinct role_id, module, permission from grants
on conflict do nothing;

insert into public.cms_content (id, kind, label, draft, published, status, position) values
  ('home-hero', 'hero', 'Homepage hero',
    '{"eyebrow":"For students, founders, experts and institutions","headline":"From a problem worth solving to a project worth building.","subheading":"TRUEVIX brings startup discovery, market research, idea validation and collaboration into one workspace — for students, founders, professionals and the institutions that support them.","footnote":"Arrive with an idea, or with nothing but curiosity."}',
    '{"eyebrow":"For students, founders, experts and institutions","headline":"From a problem worth solving to a project worth building.","subheading":"TRUEVIX brings startup discovery, market research, idea validation and collaboration into one workspace — for students, founders, professionals and the institutions that support them.","footnote":"Arrive with an idea, or with nothing but curiosity."}',
    'published', 1),
  ('site-banner', 'banner', 'Site announcement banner', '{"text":"","linkLabel":"","linkHref":""}', null, 'draft', 2),
  ('about-intro', 'about_intro', 'About page introduction',
    '{"lead":"TRUEVIX is where startup ideas are found, tested and built — with the people and evidence each step needs."}',
    '{"lead":"TRUEVIX is where startup ideas are found, tested and built — with the people and evidence each step needs."}', 'published', 3),
  ('footer-links', 'footer_links', 'Footer resource links', '{"links":"Help and FAQs | /help"}', '{"links":"Help and FAQs | /help"}', 'published', 4),
  ('faq-1', 'faq', 'FAQ: Is my idea visible to everyone?',
    '{"question":"Is my idea visible to everyone?","answer":"Only if you choose Public summary. Private ideas are visible to you and the team members you add."}',
    '{"question":"Is my idea visible to everyone?","answer":"Only if you choose Public summary. Private ideas are visible to you and the team members you add."}', 'published', 10),
  ('faq-2', 'faq', 'FAQ: Are opportunity listings partnerships?',
    '{"question":"Are opportunities on TRUEVIX partnerships?","answer":"No. Listing an opportunity does not mean TRUEVIX or Weblaze Technologies has a partnership with its organiser unless the listing says so."}',
    '{"question":"Are opportunities on TRUEVIX partnerships?","answer":"No. Listing an opportunity does not mean TRUEVIX or Weblaze Technologies has a partnership with its organiser unless the listing says so."}', 'published', 11),
  ('faq-3', 'faq', 'FAQ: Does the AI Researcher use live data?',
    '{"question":"Does the AI Researcher use live data?","answer":"Not yet. No AI model or search provider is connected, so reports are research plans built from a template and are labelled as such."}',
    '{"question":"Does the AI Researcher use live data?","answer":"Not yet. No AI model or search provider is connected, so reports are research plans built from a template and are labelled as such."}', 'published', 12),
  ('help-1', 'help', 'Help: Submitting an idea',
    '{"title":"Submitting an idea","body":"Open Submit an idea from the sidebar. You can save a draft at any step. Submitting requires the ownership declaration."}',
    '{"title":"Submitting an idea","body":"Open Submit an idea from the sidebar. You can save a draft at any step. Submitting requires the ownership declaration."}', 'published', 20)
on conflict (id) do nothing;

insert into public.cms_versions (cms_id, version, fields)
select id, 1, published from public.cms_content where published is not null
on conflict do nothing;
