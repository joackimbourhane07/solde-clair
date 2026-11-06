#!/usr/bin/env python3
"""Cherche les emojis dans les fichiers du site (l'interface ne doit en contenir aucun).

Usage : python3 verifier_emojis.py src index.html [autres dossiers ou fichiers]
Les dossiers de tests (__tests__, e2e, test) sont ignorés : ils peuvent contenir l'expression
régulière qui sert justement à détecter les emojis.
Code de sortie : 0 si rien n'est trouvé, 1 sinon.
"""
import pathlib
import re
import sys

EMOJI = re.compile('[\U0001F000-\U0001FAFF☀-➿⬀-⯿️]')
EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json', '.md', '.svg', '.vue', '.svelte'}
IGNORES = {'node_modules', 'dist', '__tests__', 'e2e', 'test', 'tests', '.git'}


def fichiers(chemins):
    for c in chemins:
        p = pathlib.Path(c)
        if p.is_file():
            yield p
        elif p.is_dir():
            for f in p.rglob('*'):
                if f.is_file() and f.suffix in EXTENSIONS and not (IGNORES & set(f.parts)):
                    yield f


def main():
    chemins = sys.argv[1:] or ['src', 'index.html']
    trouves = 0
    for f in fichiers(chemins):
        try:
            lignes = f.read_text(encoding='utf-8').splitlines()
        except (UnicodeDecodeError, OSError):
            continue
        for i, ligne in enumerate(lignes, 1):
            if EMOJI.search(ligne):
                trouves += 1
                print(f'{f}:{i}: {ligne.strip()[:100]}')
    print(f'{trouves} ligne(s) avec emoji' if trouves else 'Aucun emoji trouvé.')
    sys.exit(1 if trouves else 0)


if __name__ == '__main__':
    main()
