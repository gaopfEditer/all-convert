from app.core.security import safe_filename


def test_safe_filename_strips_path():
    assert safe_filename("../../etc/passwd") == "passwd"
    assert ".." not in safe_filename("..")
