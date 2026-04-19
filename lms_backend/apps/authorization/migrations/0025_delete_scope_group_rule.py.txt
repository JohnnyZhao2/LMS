from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('authorization', '0024_alter_scopegrouprule_created_at_and_more'),
    ]

    # ScopeGroupRule was removed from 0023 before this migration history was finalized.
    operations = []
