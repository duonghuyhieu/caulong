import json
from datetime import date, datetime
from typing import Any

from fastapi import HTTPException, status
from openai import OpenAI
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.fund_transaction import FundTransaction
from app.models.member import Member
from app.models.play_session import PlaySession
from app.schemas.ai import AIChatMessage
from app.services.fund_transactions import get_fund_summary, list_fund_transactions
from app.services.members import list_members
from app.services.play_sessions import list_play_sessions


MAX_TOOL_ROUNDS = 4

TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "name": "get_fund_summary",
        "description": "Lay tong quan quy cau long: tong quy, quy chung, tong so du thanh vien, tong da nop, tong da tru.",
        "parameters": {
            "type": "object",
            "properties": {},
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "list_members",
        "description": "Lay danh sach thanh vien, trang thai va so du. Dung de hoi ai con bao nhieu tien, ai sap het quy, ai active/inactive.",
        "parameters": {
            "type": "object",
            "properties": {
                "status": {
                    "type": ["string", "null"],
                    "enum": ["active", "inactive", None],
                    "description": "Loc theo trang thai neu can.",
                },
                "low_balance_only": {
                    "type": "boolean",
                    "description": "Chi lay thanh vien active co so du thap hon nguong canh bao.",
                },
            },
            "required": ["status", "low_balance_only"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "list_play_sessions",
        "description": "Lay lich su buoi choi, chi phi, so slot, tien moi slot, du lam tron va nguoi tham gia.",
        "parameters": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 50,
                    "description": "So buoi gan nhat can lay.",
                },
                "from_date": {
                    "type": ["string", "null"],
                    "description": "Ngay bat dau YYYY-MM-DD neu can loc.",
                },
                "to_date": {
                    "type": ["string", "null"],
                    "description": "Ngay ket thuc YYYY-MM-DD neu can loc.",
                },
            },
            "required": ["limit", "from_date", "to_date"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "list_fund_transactions",
        "description": "Lay lich su giao dich quy. Player chi duoc xem giao dich cua chinh minh; thu quy xem duoc tat ca hoac loc theo member.",
        "parameters": {
            "type": "object",
            "properties": {
                "member_id": {
                    "type": ["string", "null"],
                    "description": "ID thanh vien can loc. De null neu thu quy muon xem tat ca.",
                },
                "type": {
                    "type": ["string", "null"],
                    "enum": [
                        "member_deposit",
                        "session_charge",
                        "rounding_surplus",
                        "manual_adjustment",
                        "session_refund",
                        "common_fund_expense",
                        None,
                    ],
                    "description": "Loai giao dich can loc neu co.",
                },
                "limit": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 80,
                    "description": "So giao dich gan nhat can lay.",
                },
            },
            "required": ["member_id", "type", "limit"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "get_current_member",
        "description": "Lay thong tin nguoi dang dang nhap: ten, role, status, so du.",
        "parameters": {
            "type": "object",
            "properties": {},
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "find_member",
        "description": "Tim thanh vien theo ten hoac username. Dung khi user hoi bang ten ngan nhu Minh, Lan, Hieu.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Ten, username hoac mot phan ten can tim.",
                }
            },
            "required": ["query"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "get_member_activity",
        "description": "Tong hop hoat dong cua mot thanh vien: so du, tong nap, tong bi tru, cac buoi da tham gia.",
        "parameters": {
            "type": "object",
            "properties": {
                "member_id": {"type": "string", "description": "ID thanh vien can xem."},
                "from_date": {
                    "type": ["string", "null"],
                    "description": "Ngay bat dau YYYY-MM-DD neu can loc.",
                },
                "to_date": {
                    "type": ["string", "null"],
                    "description": "Ngay ket thuc YYYY-MM-DD neu can loc.",
                },
            },
            "required": ["member_id", "from_date", "to_date"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "get_monthly_summary",
        "description": "Tong hop theo thang: so buoi choi, tong chi phi, tong nap, tong bi tru, du lam tron.",
        "parameters": {
            "type": "object",
            "properties": {
                "month": {"type": "integer", "minimum": 1, "maximum": 12},
                "year": {"type": "integer", "minimum": 2000, "maximum": 2100},
            },
            "required": ["month", "year"],
            "additionalProperties": False,
        },
        "strict": True,
    },
]


def answer_question(
    db: Session,
    current_member: Member,
    message: str,
    history: list[AIChatMessage] | None = None,
) -> str:
    settings = get_settings()

    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENAI_API_KEY chua duoc cau hinh",
        )

    client = OpenAI(api_key=settings.openai_api_key)

    response = client.responses.create(
        model=settings.openai_model,
        input=build_input_items(current_member, message, history or []),
        tools=TOOLS,
        tool_choice="auto",
    )

    for _ in range(MAX_TOOL_ROUNDS):
        tool_calls = [
            item for item in response.output if getattr(item, "type", None) == "function_call"
        ]
        if not tool_calls:
            return response.output_text.strip() or "Minh chua tim thay cau tra loi phu hop."

        tool_outputs = []
        for call in tool_calls:
            result = run_tool(
                db=db,
                current_member=current_member,
                name=call.name,
                arguments=parse_arguments(call.arguments),
            )
            tool_outputs.append(
                {
                    "type": "function_call_output",
                    "call_id": call.call_id,
                    "output": json.dumps(result, ensure_ascii=False),
                }
            )

        response = client.responses.create(
            model=settings.openai_model,
            previous_response_id=response.id,
            input=tool_outputs,
            tools=TOOLS,
        )

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="AI goi qua nhieu tool. Vui long hoi cu the hon.",
    )


def build_system_prompt(current_member: Member) -> str:
    today = date.today().isoformat()
    return (
        "Ban la tro ly AI cua app quan ly quy cau long. "
        "Chi tra loi dua tren du lieu tu tool; khong bia so lieu. "
        "Chi ho tro hoi dap, tuyet doi khong nap tien, tao buoi choi, sua so du hay ghi du lieu. "
        "Neu nguoi dung yeu cau thao tac ghi du lieu, hay noi AI hien chi ho tro hoi dap va vui long dung form trong app. "
        "Tra loi bang tieng Viet tu nhien, ngan gon, dinh dang tien VND. "
        "Khi hoi buoi choi ton bao nhieu, dung truong total_cost/actual_cost, khong dung total_charged. "
        "total_charged la tong tien da tru/thu tu thanh vien sau lam tron. "
        "Khi hoi ai sap het quy, sap het quy nghia la balance <= low_balance_threshold; hay liet ke tat ca members tool tra ve, khong chi nguoi co balance bang 0. "
        "Khi khong du du lieu, hay noi ro la chua co du lieu. "
        f"Nguoi dang dang nhap: id={current_member.id}, ten={current_member.name}, "
        f"username={current_member.username}, role={current_member.role}, balance={current_member.balance}. "
        f"Ngay hien tai: {today}."
    )


def build_input_items(
    current_member: Member,
    message: str,
    history: list[AIChatMessage],
) -> list[dict[str, str]]:
    items = [{"role": "system", "content": build_system_prompt(current_member)}]
    for item in history[-12:]:
        items.append({"role": item.role, "content": item.content})
    items.append({"role": "user", "content": message})
    return items


def parse_arguments(raw: str) -> dict[str, Any]:
    try:
        value = json.loads(raw or "{}")
    except json.JSONDecodeError:
        return {}
    return value if isinstance(value, dict) else {}


def run_tool(
    db: Session,
    current_member: Member,
    name: str,
    arguments: dict[str, Any],
) -> Any:
    if name == "get_fund_summary":
        return get_fund_summary(db)
    if name == "list_members":
        return tool_list_members(db, arguments)
    if name == "list_play_sessions":
        return tool_list_play_sessions(db, arguments)
    if name == "list_fund_transactions":
        return tool_list_fund_transactions(db, current_member, arguments)
    if name == "get_current_member":
        return serialize_member(current_member)
    if name == "find_member":
        return tool_find_member(db, arguments)
    if name == "get_member_activity":
        return tool_get_member_activity(db, current_member, arguments)
    if name == "get_monthly_summary":
        return tool_get_monthly_summary(db, arguments)
    raise HTTPException(status_code=400, detail=f"Unknown AI tool: {name}")


def tool_list_members(db: Session, arguments: dict[str, Any]) -> Any:
    settings = get_settings()
    status_filter = arguments.get("status")
    low_balance_only = bool(arguments.get("low_balance_only", False))

    members = list_members(db)
    if status_filter:
        members = [member for member in members if member.status == status_filter]
    if low_balance_only:
        members = [
            member
            for member in members
            if member.status == "active" and member.balance <= settings.low_balance_threshold
        ]

    serialized = [serialize_member(member) for member in members]

    if low_balance_only:
        return {
            "low_balance_threshold": settings.low_balance_threshold,
            "count": len(serialized),
            "members": serialized,
            "definition": "Sap het quy = thanh vien active co balance <= low_balance_threshold.",
        }

    return serialized


def tool_list_play_sessions(db: Session, arguments: dict[str, Any]) -> list[dict[str, Any]]:
    limit = clamp_int(arguments.get("limit"), default=20, minimum=1, maximum=50)
    from_dt = parse_date_start(arguments.get("from_date"))
    to_dt = parse_date_end(arguments.get("to_date"))

    sessions = list_play_sessions(db)
    if from_dt:
        sessions = [session for session in sessions if session.played_at >= from_dt]
    if to_dt:
        sessions = [session for session in sessions if session.played_at <= to_dt]

    return [serialize_play_session(session) for session in sessions[:limit]]


def tool_list_fund_transactions(
    db: Session,
    current_member: Member,
    arguments: dict[str, Any],
) -> list[dict[str, Any]]:
    limit = clamp_int(arguments.get("limit"), default=30, minimum=1, maximum=80)
    requested_member_id = arguments.get("member_id")
    transaction_type = arguments.get("type")

    if current_member.role == "treasurer":
        member_id = requested_member_id if isinstance(requested_member_id, str) and requested_member_id else None
    else:
        member_id = current_member.id

    transactions = list_fund_transactions(db, member_id=member_id)
    if transaction_type:
        transactions = [
            transaction for transaction in transactions if transaction.type == transaction_type
        ]

    return [serialize_transaction(transaction) for transaction in transactions[:limit]]


def tool_find_member(db: Session, arguments: dict[str, Any]) -> list[dict[str, Any]]:
    query = str(arguments.get("query") or "").strip().lower()
    if not query:
        return []

    matches = []
    for member in list_members(db):
        haystack = f"{member.name} {member.username}".lower()
        if query in haystack:
            matches.append(member)

    return [serialize_member(member) for member in matches[:10]]


def tool_get_member_activity(
    db: Session,
    current_member: Member,
    arguments: dict[str, Any],
) -> dict[str, Any]:
    member_id = str(arguments.get("member_id") or "")
    if current_member.role != "treasurer" and member_id != current_member.id:
        member_id = current_member.id

    member = db.get(Member, member_id)
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")

    from_dt = parse_date_start(arguments.get("from_date"))
    to_dt = parse_date_end(arguments.get("to_date"))
    transactions = list_fund_transactions(db, member_id=member.id)
    transactions = filter_transactions_by_date(transactions, from_dt, to_dt)

    sessions = list_play_sessions(db)
    participated_sessions = [
        session
        for session in sessions
        if any(participant.member_id == member.id for participant in session.participants)
    ]
    if from_dt:
        participated_sessions = [
            session for session in participated_sessions if session.played_at >= from_dt
        ]
    if to_dt:
        participated_sessions = [
            session for session in participated_sessions if session.played_at <= to_dt
        ]

    return {
        "member": serialize_member(member),
        "total_deposit_amount": sum(
            transaction.amount
            for transaction in transactions
            if transaction.type == "member_deposit" and transaction.amount > 0
        ),
        "total_session_charge_amount": abs(
            sum(
                transaction.amount
                for transaction in transactions
                if transaction.type == "session_charge" and transaction.amount < 0
            )
        ),
        "transaction_count": len(transactions),
        "play_session_count": len(participated_sessions),
        "transactions": [serialize_transaction(transaction) for transaction in transactions[:30]],
        "play_sessions": [
            serialize_play_session(session) for session in participated_sessions[:30]
        ],
    }


def tool_get_monthly_summary(db: Session, arguments: dict[str, Any]) -> dict[str, Any]:
    month = clamp_int(arguments.get("month"), default=date.today().month, minimum=1, maximum=12)
    year = clamp_int(arguments.get("year"), default=date.today().year, minimum=2000, maximum=2100)
    start_dt = datetime(year, month, 1)
    end_dt = datetime(year + 1, 1, 1) if month == 12 else datetime(year, month + 1, 1)

    sessions = [
        session
        for session in list_play_sessions(db)
        if start_dt <= session.played_at < end_dt
    ]

    transactions = list(
        db.scalars(
            select(FundTransaction).where(
                FundTransaction.created_at >= start_dt,
                FundTransaction.created_at < end_dt,
                FundTransaction.voided_at.is_(None),
            )
        ).all()
    )

    return {
        "month": month,
        "year": year,
        "play_session_count": len(sessions),
        "total_session_cost": sum(session.total_cost for session in sessions),
        "total_slots": sum(session.total_slots for session in sessions),
        "total_charged": sum(session.total_charged for session in sessions),
        "total_rounding_surplus": sum(session.surplus_amount for session in sessions),
        "total_deposit_amount": sum(
            transaction.amount
            for transaction in transactions
            if transaction.type == "member_deposit" and transaction.amount > 0
        ),
        "total_session_charge_amount": abs(
            sum(
                transaction.amount
                for transaction in transactions
                if transaction.type == "session_charge" and transaction.amount < 0
            )
        ),
        "total_common_expense_amount": abs(
            sum(
                transaction.amount
                for transaction in transactions
                if transaction.type == "common_fund_expense" and transaction.amount < 0
            )
        ),
        "play_sessions": [serialize_play_session(session) for session in sessions[:30]],
    }


def filter_transactions_by_date(
    transactions: list[FundTransaction],
    from_dt: datetime | None,
    to_dt: datetime | None,
) -> list[FundTransaction]:
    if from_dt:
        transactions = [
            transaction for transaction in transactions if transaction.created_at >= from_dt
        ]
    if to_dt:
        transactions = [
            transaction for transaction in transactions if transaction.created_at <= to_dt
        ]
    return transactions


def parse_date_start(value: Any) -> datetime | None:
    parsed = parse_date(value)
    return datetime.combine(parsed, datetime.min.time()) if parsed else None


def parse_date_end(value: Any) -> datetime | None:
    parsed = parse_date(value)
    return datetime.combine(parsed, datetime.max.time()) if parsed else None


def parse_date(value: Any) -> date | None:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        return date.fromisoformat(value.strip())
    except ValueError:
        return None


def clamp_int(value: Any, default: int, minimum: int, maximum: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default
    return max(minimum, min(maximum, parsed))


def serialize_member(member: Member) -> dict[str, Any]:
    return {
        "id": member.id,
        "username": member.username,
        "name": member.name,
        "role": member.role,
        "status": member.status,
        "balance": member.balance,
    }


def serialize_play_session(session: PlaySession) -> dict[str, Any]:
    return {
        "id": session.id,
        "played_at": session.played_at.isoformat(),
        "actual_cost": session.total_cost,
        "total_cost": session.total_cost,
        "total_slots": session.total_slots,
        "cost_per_slot": session.cost_per_slot,
        "total_charged": session.total_charged,
        "surplus_amount": session.surplus_amount,
        "money_field_notes": {
            "actual_cost": "Chi phi that cua buoi choi. Dung truong nay khi user hoi buoi ton bao nhieu.",
            "total_charged": "Tong tien da tru/thu tu thanh vien sau khi lam tron.",
            "surplus_amount": "Phan chenhlech do lam tron.",
        },
        "status": session.status,
        "note": session.note,
        "participants": [
            {
                "member_id": participant.member_id,
                "slot_count": participant.slot_count,
                "charged_amount": participant.charged_amount,
            }
            for participant in session.participants
        ],
    }


def serialize_transaction(transaction: FundTransaction) -> dict[str, Any]:
    return {
        "id": transaction.id,
        "member_id": transaction.member_id,
        "play_session_id": transaction.play_session_id,
        "type": transaction.type,
        "amount": transaction.amount,
        "balance_after": transaction.balance_after,
        "description": transaction.description,
        "created_at": transaction.created_at.isoformat(),
        "voided_at": transaction.voided_at.isoformat() if transaction.voided_at else None,
    }
