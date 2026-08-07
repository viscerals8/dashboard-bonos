from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app import dashboard as dashboard_module
from app.dashboard import _account_scope, _current_rut, _run_scoped_query


def test_account_scope_empty_user():
    assert _account_scope({}) == ([], [])


def test_account_scope_with_values():
    user = {"empresas": [1, 2], "zonas": [4]}
    assert _account_scope(user) == ([1, 2], [4])


def test_account_scope_none_values():
    user = {"empresas": None, "zonas": None}
    assert _account_scope(user) == ([], [])


def test_current_rut_present():
    assert _current_rut({"rut": "12345678-9"}) == "12345678-9"


def test_current_rut_missing_raises_400():
    with pytest.raises(HTTPException) as exc_info:
        _current_rut({})

    assert exc_info.value.status_code == 400


def _mock_engine(return_rows):
    mock_engine = MagicMock()
    mock_conn = MagicMock()
    mock_engine.connect.return_value.__enter__.return_value = mock_conn
    mock_conn.execute.return_value.mappings.return_value.all.return_value = return_rows
    return mock_engine, mock_conn


def test_run_scoped_query_without_scope_does_not_filter():
    mock_engine, mock_conn = _mock_engine(["fila1", "fila2"])

    with patch.object(dashboard_module, "engine", mock_engine):
        result = _run_scoped_query(
            "SELECT * FROM t WHERE 1=1 {extra_where}", "t.ID_EMPRESA", "t.id_zona", {}
        )

    assert result == ["fila1", "fila2"]
    executed_sql = mock_conn.execute.call_args[0][0].text
    assert "IN :empresas" not in executed_sql
    assert "IN :zonas" not in executed_sql


def test_run_scoped_query_filters_by_empresa_y_zona():
    mock_engine, mock_conn = _mock_engine([])
    current_user = {"empresas": [1, 2], "zonas": [4]}

    with patch.object(dashboard_module, "engine", mock_engine):
        _run_scoped_query(
            "SELECT * FROM t WHERE 1=1 {extra_where}", "t.ID_EMPRESA", "t.id_zona", current_user
        )

    executed_sql = mock_conn.execute.call_args[0][0].text
    params = mock_conn.execute.call_args[0][1]
    assert "t.ID_EMPRESA IN :empresas" in executed_sql
    assert "t.id_zona IN :zonas" in executed_sql
    assert params == {"empresas": [1, 2], "zonas": [4]}


def test_run_scoped_query_filters_solo_por_empresa():
    mock_engine, mock_conn = _mock_engine([])
    current_user = {"empresas": [1], "zonas": []}

    with patch.object(dashboard_module, "engine", mock_engine):
        _run_scoped_query(
            "SELECT * FROM t WHERE 1=1 {extra_where}", "t.ID_EMPRESA", "t.id_zona", current_user
        )

    executed_sql = mock_conn.execute.call_args[0][0].text
    assert "t.ID_EMPRESA IN :empresas" in executed_sql
    assert "t.id_zona IN :zonas" not in executed_sql
