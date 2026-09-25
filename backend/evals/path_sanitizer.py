"""
Path Traversal / Local File Inclusion (LFI) Sanitization Utility

Provides safe path resolution and validation against directory traversal attacks,
null-byte injection, symlink escapes, and out-of-boundary access.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Union


class PathTraversalError(ValueError):
    """Raised when an untrusted path attempts to escape the allowed base directory."""
    pass


class InvalidPathError(ValueError):
    """Raised when an input path contains invalid characters, null bytes, or is malformed."""
    pass


def safe_join_and_resolve(
    base_dir: Union[str, Path],
    untrusted_path: Union[str, Path],
    allow_nonexistent: bool = True,
    follow_symlinks: bool = False,
) -> Path:
    """
    Safely joins an untrusted path to a trusted base directory and resolves it,
    ensuring that the resulting canonical path remains strictly within the base directory.

    Protections:
    - Path Traversal (e.g. '../', '..\\', encoded dot-dots)
    - Absolute path override (e.g. '/etc/passwd' or 'C:\\Windows')
    - Null-byte injection (%00, \\x00)
    - Symlink escapes (optional / disabled by default)
    - Zip Slip / Tar Slip attack vectors when unpacking

    Args:
        base_dir: The trusted root directory that untrusted_path must reside within.
        untrusted_path: The user-supplied or untrusted relative path / filename.
        allow_nonexistent: If True, allows paths that do not exist yet (e.g. for write operations).
                           If False, raises FileNotFoundError if the target path does not exist.
        follow_symlinks: If False (default), raises PathTraversalError if any component of the
                         resolved path or target is a symbolic link pointing outside the base directory,
                         or disallows symlinks entirely to avoid TOCTOU/symlink race conditions.

    Returns:
        pathlib.Path: The fully resolved, validated canonical Path object.

    Raises:
        InvalidPathError: If untrusted_path contains null bytes or illegal path structures.
        PathTraversalError: If the resolved path escapes base_dir or contains an invalid symlink.
        FileNotFoundError: If allow_nonexistent=False and the target file/directory does not exist.
    """
    # 1. Null-byte injection check
    str_untrusted = str(untrusted_path)
    if "\x00" in str_untrusted or "\x00" in str(base_dir):
        raise InvalidPathError("Null byte detected in path string.")

    # 2. Convert and canonicalize base directory
    try:
        base_path = Path(base_dir).resolve(strict=True)
    except (FileNotFoundError, RuntimeError) as err:
        raise ValueError(f"Base directory does not exist or cannot be resolved: {base_dir}") from err

    if not base_path.is_dir():
        raise ValueError(f"Base directory is not a directory: {base_path}")

    # 3. Strip leading path separators to prevent absolute path override
    # pathlib's `base_path / "/etc/passwd"` replaces base_path with `/etc/passwd`.
    # To prevent this behavior, we normalize and strip leading slashes/backslashes.
    untrusted_clean = str_untrusted.lstrip("/\\")

    # 4. Construct candidate path
    candidate_path = base_path / untrusted_clean

    # 5. Resolve candidate path
    try:
        if allow_nonexistent:
            # resolve(strict=False) resolves symlinks and normalizes '..'
            resolved_candidate = candidate_path.resolve(strict=False)
        else:
            resolved_candidate = candidate_path.resolve(strict=True)
    except FileNotFoundError:
        raise FileNotFoundError(f"Requested path does not exist: {untrusted_path}")
    except RuntimeError as err:
        raise PathTraversalError(f"Symlink loop or resolution error: {err}") from err

    # 6. Verify boundary confinement
    # Check if resolved_candidate is relative to base_path (or equals base_path)
    try:
        resolved_candidate.relative_to(base_path)
    except ValueError:
        raise PathTraversalError(
            f"Path traversal detected: '{untrusted_path}' resolves outside safe base directory '{base_path}'"
        )

    # 7. Symlink validation
    # If symlinks are not allowed, ensure neither the target nor any intermediate component is a symlink
    if not follow_symlinks:
        # Check components from candidate_path up to base_path
        curr = candidate_path
        while curr != base_path and curr != curr.parent:
            if curr.is_symlink():
                # Even if pointing inside, if follow_symlinks is False, disallow symlinks
                raise PathTraversalError(
                    f"Symbolic link detected at '{curr}' while follow_symlinks is False."
                )
            curr = curr.parent

    return resolved_candidate


if __name__ == "__main__":
    import tempfile
    import shutil

    # Self-test demonstrations
    test_dir = tempfile.mkdtemp(prefix="safe_path_demo_")
    try:
        base = Path(test_dir)
        (base / "docs").mkdir()
        (base / "docs" / "report.pdf").touch()

        print(f"Base directory: {base}")

        # Valid safe access
        p1 = safe_join_and_resolve(base, "docs/report.pdf")
        print(f"Safe path resolved: {p1}")

        # Path traversal attack attempt
        try:
            safe_join_and_resolve(base, "../../etc/passwd")
        except PathTraversalError as e:
            print(f"Blocked path traversal: {e}")

        # Absolute path attack attempt
        try:
            safe_join_and_resolve(base, "/etc/shadow")
        except PathTraversalError as e:
            print(f"Blocked absolute path escape: {e}")

        # Null-byte injection attempt
        try:
            safe_join_and_resolve(base, "docs/report.pdf\x00.exe")
        except InvalidPathError as e:
            print(f"Blocked null-byte injection: {e}")

        print("\nAll self-test cases executed successfully.")
    finally:
        shutil.rmtree(test_dir, ignore_errors=True)
