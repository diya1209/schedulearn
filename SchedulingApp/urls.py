"""
URL configuration for SchedulingApp project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from schedule import views
urlpatterns = [
    path('admin/', admin.site.urls),
    path('',views.demo,name='index'),
    path('signup/',views.signup,name='signup'),
    path('register/',views.register,name='register'),
    path('login/',views.login,name='login'),
    path('dashboard/',views.calendar,name='dashboard'),
    path('task_form/',views.task_form,name='task_form'),
    path('add_task/',views.add_task,name='add_task'),
    path('all_events/',views.all_events,name='all_events'),
    path('info/',views.info,name='info'),
]
