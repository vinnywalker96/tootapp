from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0001_initial'),
        ('trips', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='trip',
            name='is_accepted',
            field=models.BooleanField(default=False),
        ),
        migrations.CreateModel(
            name='Bid',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('timestamp', models.DateTimeField(default=django.utils.timezone.now)),
                ('is_accepted', models.BooleanField(default=False)),
                ('driver', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='authentication.driver')),
                ('trip', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bids', to='trips.trip')),
            ],
            options={
                'ordering': ['-timestamp'],
            },
        ),
        migrations.CreateModel(
            name='ChatMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('content', models.TextField()),
                ('timestamp', models.DateTimeField(default=django.utils.timezone.now)),
                ('sender', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='authentication.user')),
                ('trip', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='trips.trip')),
            ],
            options={
                'ordering': ['timestamp'],
            },
        ),
    ]

