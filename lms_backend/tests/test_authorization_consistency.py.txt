from apps.authorization.consistency import validate_authorization_consistency


def test_authorization_consistency_has_no_errors():
    assert validate_authorization_consistency() == []
