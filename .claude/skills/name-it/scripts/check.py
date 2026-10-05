#!/usr/bin/env python3
"""Name availability checks: domains and social handles for one or more names.

Usage:
  check.py NAME [NAME ...]            full check
  check.py NAME [NAME ...] --quick    .com and GitHub only, for screening a shortlist
  check.py NAME --tlds .com,.dev      choose the extensions

Prints JSON. Every result has a status of "available", "taken" or "unknown".
"unknown" means the lookup gave no clear answer: treat it as "check by hand", never as free.
Standard library only, so it runs anywhere Python 3.8+ does.
"""

import argparse
import json
import os
import re
import socket
import sys
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

TLDS = ['.com', '.ca', '.io', '.ai', '.co', '.app']
BOOTSTRAP = 'https://data.iana.org/rdap/dns.json'
TIMEOUT = 12
UA = 'name-it-skill/0.1 (name availability check)'

# Where an available domain can be registered: search page with the domain filled in.
REGISTRARS = {
    'Cloudflare': ('https://domains.cloudflare.com/?domain={}', ['.com', '.io', '.co', '.app']),
    'GoDaddy': ('https://www.godaddy.com/domainsearch/find?domainToCheck={}', TLDS),
    'Namecheap': ('https://www.namecheap.com/domains/registration/results/?domain={}', TLDS),
    'Porkbun': ('https://porkbun.com/checkout/search?q={}', ['.com', '.ca', '.io', '.co', '.app']),
}

# Handles we can look up without an account: a 404 means the handle is free.
PROBED = {
    'github': ('GitHub', 'https://github.com/{}', 'https://api.github.com/users/{}'),
    'youtube': ('YouTube', 'https://www.youtube.com/@{}', 'https://www.youtube.com/@{}'),
}

# These sites answer anonymous requests the same way whether or not the handle exists,
# so we only hand back the link to open.
MANUAL = {
    'x': ('X (Twitter)', 'https://x.com/{}'),
    'instagram': ('Instagram', 'https://www.instagram.com/{}'),
    'tiktok': ('TikTok', 'https://www.tiktok.com/@{}'),
    'linkedin': ('LinkedIn', 'https://www.linkedin.com/company/{}'),
}


def slugify(name):
    return re.sub(r'[^a-z0-9]', '', name.lower())


def status_of(url, headers=None):
    """HTTP status for a GET, or None when the request never got an answer."""
    req = urllib.request.Request(url, headers={'User-Agent': UA, **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as res:
            return res.status
    except urllib.error.HTTPError as err:
        return err.code
    except (urllib.error.URLError, socket.timeout, OSError):
        return None


def rdap_servers():
    """Map of extension (no dot) to its registry's lookup server, from the IANA list."""
    try:
        req = urllib.request.Request(BOOTSTRAP, headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=TIMEOUT) as res:
            data = json.load(res)
    except (urllib.error.URLError, socket.timeout, OSError, ValueError):
        return {}
    return {tld: urls[0] for tlds, urls in data.get('services', []) if urls for tld in tlds}


def resolves(domain):
    try:
        socket.getaddrinfo(domain, None)
        return True
    except OSError:
        return False


def check_domain(domain, servers):
    tld = domain.rsplit('.', 1)[1]
    base = servers.get(tld)
    code = status_of(base.rstrip('/') + '/domain/' + domain, {'Accept': 'application/rdap+json'}) if base else None
    if code == 200:
        status, note = 'taken', ''
    elif code == 404:
        status, note = 'available', ''
    elif resolves(domain):
        # No registry answer, but the name is live on the internet, so someone owns it
        status, note = 'taken', ''
    else:
        status = 'unknown'
        note = 'registry gave no clear answer' if base else 'no public lookup for this extension'
    out = {'domain': domain, 'status': status}
    if note:
        out['note'] = note
    if status == 'available':
        out['register'] = {label: url.format(urllib.parse.quote(domain))
                           for label, (url, tlds) in REGISTRARS.items() if '.' + tld in tlds}
    return out


def check_probed(platform, slug):
    label, page, probe = PROBED[platform]
    headers = {}
    if platform == 'github' and os.environ.get('GITHUB_TOKEN'):
        headers['Authorization'] = 'Bearer ' + os.environ['GITHUB_TOKEN']
    code = status_of(probe.format(slug), headers)
    out = {'platform': label, 'url': page.format(slug),
           'status': 'taken' if code == 200 else 'available' if code == 404 else 'unknown'}
    if out['status'] == 'unknown':
        out['note'] = 'lookup limit reached, try again later' if code in (403, 429) else 'no clear answer'
    return out


def check_name(name, tlds, quick, servers, pool):
    slug = slugify(name)
    if not slug:
        return {'name': name, 'error': 'no letters or digits to check'}
    domains = pool.map(lambda t: check_domain(slug + t, servers), tlds)
    platforms = ['github'] if quick else list(PROBED)
    socials = list(pool.map(lambda p: check_probed(p, slug), platforms))
    if not quick:
        socials += [{'platform': label, 'url': url.format(slug), 'status': 'unknown', 'note': 'open the link to check'}
                    for label, url in MANUAL.values()]
    return {'name': name, 'slug': slug, 'domains': list(domains), 'socials': socials}


def main():
    ap = argparse.ArgumentParser(description='Check domains and social handles for a name.')
    ap.add_argument('names', nargs='+')
    ap.add_argument('--quick', action='store_true', help='.com and GitHub only')
    ap.add_argument('--tlds', help='comma-separated extensions, e.g. .com,.dev')
    args = ap.parse_args()

    if args.tlds:
        tlds = ['.' + t.strip().lstrip('.').lower() for t in args.tlds.split(',') if t.strip()]
    else:
        tlds = ['.com'] if args.quick else TLDS

    servers = rdap_servers()
    with ThreadPoolExecutor(max_workers=12) as pool:
        results = [check_name(n, tlds, args.quick, servers, pool) for n in args.names]
    json.dump({'results': results}, sys.stdout, indent=2)
    print()


if __name__ == '__main__':
    main()
