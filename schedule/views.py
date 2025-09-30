from django.shortcuts import render,redirect
from django.http import HttpResponse,JsonResponse
from django.http import JsonResponse
from django.contrib.auth.models import User
from django.contrib import auth
from .models import TaskModel, NewEventModel
from datetime import date,datetime
from datetime import timedelta

def demo(request):
    return render(request,'index.html')

def signup(request):
    return render(request,'signup.html')

def register(request):
    if request.method == 'POST':
        username=request.POST['name']
        password=request.POST['password']
        try:
            user = User.objects.get(username=username)
            return redirect("/")
        except User.DoesNotExist: 
            user = User.objects.create_user(username=username,password=password)
            user.save()
            return redirect("dashboard.html")
    return render(request,"signup.html")

def login(request):
    if request.method == 'POST':
        username=request.POST['name']
        password=request.POST['password']
        x = auth.authenticate(username=username,password=password)
        if x is None: 
            return redirect("/signup")
        else:
            return redirect('dashboard.html')
    return render(request,"login.html")

def task_form(request):
    return render(request,"add-task.html")

def add_task(request):
    if request.method=='POST':
        topicname=request.POST['topic_name']
        level=int(request.POST['easiness'])
        familiarity=int(request.POST['familiar'])
        startDate=request.POST['start_date']
        endDate=request.POST['end_date']
        tm = TaskModel(topic_name=topicname,topic_familiarity=familiarity,topic_difficulty=level,start_date=startDate,end_date=endDate)
        tm.save()
        EF = (level + familiarity)/2
        if EF <= 1:
            EF = 1.5
        interval = 1
        start_event = NewEventModel(
            topic_name=topicname,
            event_date=datetime.strptime(startDate, "%Y-%m-%d").date(),
            start=datetime.strptime(startDate, "%Y-%m-%d").date(),
            end=datetime.strptime(endDate, "%Y-%m-%d").date()
        )
        start_event.save()

        for i in range(1,100,1):
            nextinterval = EF * interval
            nextinterval = int(round(nextinterval))
            if nextinterval <= 1000:
                interval=nextinterval
            event=datetime.strptime(str(startDate),"%Y-%m-%d").date()
            endDate=datetime.strptime(str(endDate),"%Y-%m-%d").date()
            eventDate=event+timedelta(days=nextinterval)

            if eventDate<=endDate:

                em=NewEventModel(topic_name=topicname,event_date=eventDate,start=event,end=endDate)
                em.save()
    return redirect('/home')


def all_events(request):
    all_events = NewEventModel.objects.all()
    out = []
    for event in all_events:
        out.append({
            'topic': event.topic_name,
            'start': event.start,
            'end':event.event_date,
            'event_date':event.event_date,
        })
    return JsonResponse(out,safe=False)

def calendar(request):
    all_events=NewEventModel.objects.all()
    context={
        "events":all_events,
    }
    return render(request,"home.html",context)

def info(request):
    return render(request,'info.html')
