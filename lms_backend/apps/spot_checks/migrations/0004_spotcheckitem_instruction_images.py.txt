from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('spot_checks', '0003_spot_check_workflow'),
    ]

    operations = [
        migrations.AddField(
            model_name='spotcheckitem',
            name='instruction_images',
            field=models.JSONField(blank=True, default=list, verbose_name='要求说明贴图'),
        ),
    ]
