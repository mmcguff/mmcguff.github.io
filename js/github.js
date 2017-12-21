function getGit() {
    
    
        var url = 'https://api.github.com/users/mmcguff/repos';
        console.log(url);
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                var obj = JSON.parse(this.responseText);
                
                //this sorts all the github repos by latest first
                obj.sort(function(a,b){
                    var c = new Date(a.pushed_at);
                    var d = new Date(b.pushed_at); 
                    return d-c;
                });
    
                console.log(obj);
    
                //this snippet returns all the projects.  
                // obj.forEach(function(i) {
    
                //     //this works as a coalesce.  If null then it will automatically take the other value.  Kind of cool. 
                //     var homepage = i.homepage || "";
                //     var description = i.description || "";
                //     var language = i.language || "";
                    
    
                //     var updated_at = convertDate(i.updated_at);
    
    
                //     //only returning repos that I want the public to see
                //     if(i.private = 'false' && i <= 2)
                //     {
                //         $('#target').append('<b>'+i.name+'</b><br />' 
                //         + '<a href='+i.html_url+' target="_blank">'+i.html_url+'</a><br />' 
                //         + '<a href='+i.homepage+' target="_blank">'+homepage+'</a><br />' 
                //         + '<p>'+updated_at+'</p><br />'
                //         + '<p>'+description+'</p><br />'
                //         + '<p>'+language+'</p><hr><br />')
                //     }
               // })
    
                for(var i = 0; i < 3; i++)
                {
                    //this works as a coalesce.  If null then it will automatically take the other value.  Kind of cool. 
                    var homepage = obj[i].homepage || "";
                    var description = obj[i].description || "";
                    var language = obj[i].language || "";
                    
    
                    var pushed_at = convertDate(obj[i].pushed_at);//using a different element that appears to be more accurate as to the last update.
    
    
                    //only returning repos that I want the public to see
                    // if(obj[i].private = 'false')
                    // {
                    //     $('#target').append('<b>'+obj[i].name+'</b><br />' 
                    //     + '<a href='+obj[i].html_url+' target="_blank">'+obj[i].html_url+'</a><br />' 
                    //     + '<a href='+homepage+' target="_blank">'+homepage+'</a><br />' 
                    //     + '<p>'+updated_at+'</p><br />'
                    //     + '<p>'+description+'</p><br />'
                    //     + '<p>'+language+'</p><hr><br />')
                    // }
            if(obj[i].private = 'false')
            {
            $('#target').append(
    
                "<div class='w3-container'>"
                +    "<h5 class='w3-opacity'>"
                +      "<a href='"+obj[i].html_url+"'target='_blank'><b>"+obj[i].name+"</b></a>"
                +    "</h5>"
                +    "<h6 class='w3-text-blue'>"
                +    "<i class='fa fa-calendar fa-fw w3-margin-right'></i>"+pushed_at
                // +    "<span class='w3-tag w3-red w3-round'>New</span>"
                +    "</h6>"
                +    "<p>"+description+"</p>"
                +    "<div class='f6 text-gray mt-2'>"
                +    "<span class='label w3-blue'>"+language+"</span>"
                +    "</div>"
                +    "<hr>"
                +  "</div>"
                +  "</div>")
              }
    
                    
    
    
    
    
                }
            }
        };
        xmlhttp.open("GET", url, true);
        xmlhttp.send();
    }
    
    //if we want the dates returned differently we can just alter this function. 
        function convertDate(date)
        {
            var d = new Date(date);
            var n = d.toDateString();
            return n;
        }
    
    