from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0001_initial'),
        ('trips', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='trip',
            name='allow_bidding',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='trip',
            name='bidding_end_time',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='trip',
            name='max_bid',
            field=models.DecimalField(decimal_places=2, default=0.0, max_digits=10),
        ),
        migrations.AddField(
            model_name='trip',
            name='min_bid',
            field=models.DecimalField(decimal_places=2, default=0.0, max_digits=10),
        ),
        migrations.CreateModel(
            name='Bid',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, unique=True)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('updated', models.DateTimeField(auto_now=True)),
                ('is_accepted', models.BooleanField(default=False)),
                ('driver', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bids', to='authentication.driver')),
                ('trip', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bids', to='trips.trip')),
            ],
            options={
                'ordering': ['amount'],
            },
        ),
        migrations.CreateModel(
            name='ChatMessage',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False, unique=True)),
                ('sender_type', models.CharField(choices=[('USER', 'User'), ('DRIVER', 'Driver')], max_length=10)),
                ('sender_id', models.CharField(max_length=50)),
                ('message', models.TextField()),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('is_read', models.BooleanField(default=False)),
                ('trip', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='trips.trip')),
            ],
            options={
                'ordering': ['created'],
            },
        ),
    ]

