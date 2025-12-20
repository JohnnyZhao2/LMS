"""
Hypothesis strategies for property-based testing.
"""
from hypothesis import strategies as st


# Basic strategies
username_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('L', 'N'), whitelist_characters='_'),
    min_size=3,
    max_size=30
).filter(lambda x: x and not x[0].isdigit())

email_strategy = st.emails()

password_strategy = st.text(min_size=8, max_size=50)

# User data strategy
@st.composite
def user_data_strategy(draw):
    """Generate valid user data for testing."""
    return {
        'username': draw(username_strategy),
        'email': draw(email_strategy),
        'password': draw(password_strategy),
        'username': draw(st.text(min_size=1, max_size=50)),
        'employee_id': draw(st.text(
            alphabet=st.characters(whitelist_categories=('N',)),
            min_size=5,
            max_size=20
        )),
    }


# Role strategies
role_codes = st.sampled_from(['STUDENT', 'MENTOR', 'DEPT_MANAGER', 'ADMIN', 'TEAM_MANAGER'])


# Question type strategies
question_types = st.sampled_from(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'])


# Task type strategies
task_types = st.sampled_from(['LEARNING', 'PRACTICE', 'EXAM'])


# Task status strategies
task_statuses = st.sampled_from(['IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'PENDING'])


# Score strategies
score_strategy = st.decimals(min_value=0, max_value=100, places=2)


# Additional strategies will be added as models are implemented
